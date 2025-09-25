import {
  ProjectBlockData,
  BulletPoint,
  RawProjectData,
  Month,
  RawProjectBulletData,
} from '../types/projects'
import { bulletPointSchema, projectBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import { nowIso } from './dataUtils'
import { useAuthStore, useDbStore } from '@/stores'
import {
  deleteProjectBulletsQuery,
  deleteProjectQuery,
  getProjectBulletsQuery,
  getProjectsQuery,
  insertProjectChangelogQuery,
  reorderProjectBulletsQuery,
  reorderProjectPositionsQuery,
  toggleProjectBulletLockQuery,
  toggleProjectBulletsLockAllQuery,
  updateProjectPositionQuery,
  upsertProjectBulletQuery,
  upsertProjectQuery,
} from '../sql'
import {
  createUnknownError,
  createValidationError,
  Failure,
  Result,
  Success,
} from '../types/errors'
import { getLastKnownUserId } from '../utils'
import { v4 as uuidv4 } from 'uuid'
import { omit, pick } from 'lodash'

class ProjectsManager {
  private translateRawProject(raw: RawProjectData): ProjectBlockData {
    return {
      id: raw.id,
      title: raw.title,
      link: raw.link || '',
      technologies: raw.technologies || [],
      description: raw.description || '',
      startDate: {
        month: (raw.start_month as Month | '' | undefined) || '',
        year: raw.start_year?.toString() || '',
      },
      endDate: {
        month: (raw.end_month as Month | '' | undefined) || '',
        year: raw.end_year?.toString() || '',
        isPresent: raw.is_present || false,
      },
      bulletPoints: raw.bullet_points || [],
      isIncluded: raw.is_included ?? true,
      position: raw.position ?? 0,
      updatedAt: raw.updated_at || undefined,
    }
  }

  private translateRawProjectBullet(raw: RawProjectBulletData): BulletPoint {
    return {
      id: raw.id,
      text: raw.text,
      isLocked: raw.is_locked,
      position: raw.position,
    }
  }

  async get(
    sectionId?: string
  ): Promise<ProjectBlockData | ProjectBlockData[] | undefined> {
    const { db } = useDbStore.getState()

    const data = await db?.query(getProjectsQuery)

    if (!data?.rows?.length) {
      return sectionId ? undefined : DEFAULT_STATE_VALUES.PROJECTS
    }

    const translatedData = (data.rows as RawProjectData[]).map((row) =>
      this.translateRawProject(row)
    )

    if (sectionId) {
      return translatedData.find((item) => item.id === sectionId)
    }

    return translatedData
  }

  async upsert(data: ProjectBlockData): Promise<Result<ProjectBlockData[]>> {
    const validation = projectBlockSchema.safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid project data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const blockToUpsert = validation.data

      const currentData = ((await this.get()) as ProjectBlockData[]) || []
      const existingBlock = currentData.find(
        (block) => block.id === blockToUpsert.id
      )

      const position = existingBlock
        ? existingBlock.position
        : currentData.length

      await db?.query(upsertProjectQuery, [
        blockToUpsert.id,
        blockToUpsert.title,
        blockToUpsert.link,
        blockToUpsert.technologies,
        blockToUpsert.description,
        blockToUpsert.startDate.month,
        blockToUpsert.startDate.year,
        blockToUpsert.endDate.month,
        blockToUpsert.endDate.year,
        blockToUpsert.endDate.isPresent,
        blockToUpsert.isIncluded,
        position,
        timestamp,
      ])

      const blockWithPosition = { ...blockToUpsert, position }

      await db?.query(insertProjectChangelogQuery, [
        'upsert',
        JSON.stringify(omit(blockWithPosition, ['bulletPoints'])),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to save project', error))
    }
  }

  async delete(blockId: string): Promise<Result<ProjectBlockData[]>> {
    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const existingData = (await this.get()) as ProjectBlockData[]
      const blockExists = existingData.find((item) => item.id === blockId)

      if (!blockExists) {
        return Failure(createValidationError('Project block not found'))
      }

      await db?.query(deleteProjectQuery, [blockId])

      await db?.query(reorderProjectPositionsQuery, [timestamp])

      await db?.query(insertProjectChangelogQuery, [
        'delete',
        JSON.stringify({ id: blockId }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to delete project', error))
    }
  }

  async reorder(data: ProjectBlockData[]): Promise<Result<ProjectBlockData[]>> {
    const validation = projectBlockSchema.array().safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid project data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      for (let index = 0; index < validation.data.length; index++) {
        const block = validation.data[index]
        await db?.query(updateProjectPositionQuery, [
          block.id,
          index,
          timestamp,
        ])
      }

      await db?.query(insertProjectChangelogQuery, [
        'reorder',
        JSON.stringify(
          validation.data.map((item) => pick(item, ['id', 'position']))
        ),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to reorder projects', error))
    }
  }

  async saveBullet(
    data: BulletPoint,
    sectionId: string
  ): Promise<Result<ProjectBlockData[]>> {
    return this.saveBullets([data], sectionId)
  }

  async saveBullets(
    bullets: BulletPoint[],
    sectionId: string
  ): Promise<Result<ProjectBlockData[]>> {
    const validation = bulletPointSchema.array().safeParse(bullets)
    if (!validation.success) {
      return Failure(
        createValidationError('Invalid bullet data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const currentBulletsResult = await db?.query(getProjectBulletsQuery, [
        sectionId,
      ])
      const currentBullets =
        (currentBulletsResult?.rows as RawProjectBulletData[]) || []

      for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i]
        const existingBullet = currentBullets.find((b) => b.id === bullet.id)

        let position = bullet.position ?? 0

        if (!existingBullet) {
          position = currentBullets.length + i
        } else if (bullet.position === undefined) {
          position = existingBullet.position ?? 0
        }

        await db?.query(upsertProjectBulletQuery, [
          bullet.id,
          sectionId,
          bullet.text,
          bullet.isLocked ?? false,
          position,
          timestamp,
        ])
      }

      const updatedBullets = await db?.query(getProjectBulletsQuery, [
        sectionId,
      ])
      const translatedUpdatedBullets = (
        updatedBullets?.rows as RawProjectBulletData[]
      ).map((b) => this.translateRawProjectBullet(b))

      await db?.query(insertProjectChangelogQuery, [
        'upsert_bullets',
        JSON.stringify({
          projectId: sectionId,
          data: translatedUpdatedBullets,
        }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to save bullets', error))
    }
  }

  async deleteBullet(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ProjectBlockData[]>> {
    return this.deleteBullets(sectionId, [bulletId])
  }

  async deleteBullets(
    sectionId: string,
    bulletIds: string[]
  ): Promise<Result<ProjectBlockData[]>> {
    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const currentBulletsResult = await db?.query(getProjectBulletsQuery, [
        sectionId,
      ])
      const currentBullets =
        (currentBulletsResult?.rows as RawProjectBulletData[]) || []

      for (const bulletId of bulletIds) {
        const bulletExists = currentBullets.find((b) => b.id === bulletId)
        if (!bulletExists) {
          return Failure(
            createValidationError(`Bullet point ${bulletId} not found`)
          )
        }
      }

      await db?.query(deleteProjectBulletsQuery, [bulletIds, timestamp])

      await db?.query(reorderProjectBulletsQuery, [sectionId, timestamp])

      await db?.query(insertProjectChangelogQuery, [
        'delete_bullets',
        JSON.stringify({ projectId: sectionId, bulletIds }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to delete bullets', error))
    }
  }

  async toggleBulletLock(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ProjectBlockData[]>> {
    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const currentBulletsResult = await db?.query(getProjectBulletsQuery, [
        sectionId,
      ])
      const currentBullets =
        (currentBulletsResult?.rows as RawProjectBulletData[]) || []
      const bullet = currentBullets.find((b) => b.id === bulletId)

      if (!bullet) {
        return Failure(createValidationError('Bullet point not found'))
      }

      const newLockState = !bullet.is_locked
      await db?.query(toggleProjectBulletLockQuery, [
        newLockState,
        timestamp,
        bulletId,
      ])

      const updatedBullets = await db?.query(getProjectBulletsQuery, [
        sectionId,
      ])
      const translatedUpdatedBullets = (
        updatedBullets?.rows as RawProjectBulletData[]
      ).map((b) => this.translateRawProjectBullet(b))

      await db?.query(insertProjectChangelogQuery, [
        'toggle_bullet_lock',
        JSON.stringify({
          projectId: sectionId,
          data: translatedUpdatedBullets,
        }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to toggle bullet lock', error))
    }
  }

  async toggleBulletLockAll(
    sectionId: string,
    shouldLock: boolean
  ): Promise<Result<ProjectBlockData[]>> {
    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      await db?.query(toggleProjectBulletsLockAllQuery, [
        shouldLock,
        timestamp,
        sectionId,
      ])

      const updatedBullets = await db?.query(getProjectBulletsQuery, [
        sectionId,
      ])
      const translatedUpdatedBullets = (
        updatedBullets?.rows as RawProjectBulletData[]
      ).map((b) => this.translateRawProjectBullet(b))

      await db?.query(insertProjectChangelogQuery, [
        'toggle_bullets_lock_all',
        JSON.stringify({
          projectId: sectionId,
          data: translatedUpdatedBullets,
        }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getProjectsQuery)
      const translatedResult = (result?.rows as RawProjectData[]).map((row) =>
        this.translateRawProject(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(
        createUnknownError('Failed to toggle all bullet locks', error)
      )
    }
  }
}

export const projectsManager = new ProjectsManager()
