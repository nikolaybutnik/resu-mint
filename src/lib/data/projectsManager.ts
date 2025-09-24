import {
  ProjectBlockData,
  BulletPoint,
  RawProjectData,
  Month,
  RawProjectBulletData,
} from '../types/projects'
import { projectBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import { nowIso } from './dataUtils'
import { useAuthStore, useDbStore } from '@/stores'
import {
  deleteProjectQuery,
  getProjectsQuery,
  insertProjectChangelogQuery,
  reorderProjectPositionsQuery,
  updateProjectPositionQuery,
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
      return Failure(createUnknownError('Failed to delete experience', error))
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
}

export const projectsManager = new ProjectsManager()
