import {
  ExperienceBlockData,
  BulletPoint,
  RawExperienceData,
  RawExperienceBulletData,
  Month,
} from '../types/experience'
import { experienceBlockSchema, bulletPointSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import { nowIso } from './dataUtils'
import {
  Result,
  Success,
  Failure,
  createValidationError,
  createUnknownError,
} from '../types/errors'
import { useAuthStore, useDbStore } from '@/stores'
import {
  getExperienceQuery,
  insertExperienceChangelogQuery,
  upsertExperienceQuery,
  deleteExperienceQuery,
  updateExperiencePositionQuery,
  upsertExperienceBulletQuery,
  getExperienceBulletsQuery,
  reorderExperienceBulletsQuery,
  reorderExperiencePositionsQuery,
} from '../sql'
import { v4 as uuidv4 } from 'uuid'
import { getLastKnownUserId } from '../utils'
import { omit } from 'lodash'

class ExperienceManager {
  private translateRawExperience(raw: RawExperienceData): ExperienceBlockData {
    return {
      id: raw.id,
      title: raw.title,
      companyName: raw.company_name,
      location: raw.location,
      description: raw.description || undefined,
      startDate: {
        month: (raw.start_month as Month | '' | undefined) || undefined,
        year: raw.start_year?.toString() || '',
      },
      endDate: {
        month: (raw.end_month as Month | '' | undefined) || undefined,
        year: raw.end_year?.toString() || '',
        isPresent: raw.is_present || false,
      },
      bulletPoints: raw.bullet_points || [],
      isIncluded: raw.is_included ?? true,
      position: raw.position ?? 0,
      updatedAt: raw.updated_at || undefined,
    }
  }

  private translateRawExperienceBullet(
    raw: RawExperienceBulletData
  ): BulletPoint {
    return {
      id: raw.id,
      text: raw.text,
      isLocked: raw.is_locked,
      position: raw.position,
    }
  }

  async get(
    sectionId?: string
  ): Promise<ExperienceBlockData | ExperienceBlockData[] | undefined> {
    const { db } = useDbStore.getState()

    const data = await db?.query(getExperienceQuery)

    if (!data?.rows?.length) {
      return sectionId ? undefined : DEFAULT_STATE_VALUES.EXPERIENCE
    }

    const translatedData = (data.rows as RawExperienceData[]).map((row) =>
      this.translateRawExperience(row)
    )

    if (sectionId) {
      return translatedData.find((item) => item.id === sectionId)
    }

    return translatedData
  }

  async upsert(
    data: ExperienceBlockData
  ): Promise<Result<ExperienceBlockData[]>> {
    const validation = experienceBlockSchema.safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid experience data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const blockToUpsert = validation.data

      const currentData = ((await this.get()) as ExperienceBlockData[]) || []
      const existingBlock = currentData.find(
        (block) => block.id === blockToUpsert.id
      )

      const position = existingBlock
        ? existingBlock.position
        : currentData.length

      await db?.query(upsertExperienceQuery, [
        blockToUpsert.id,
        blockToUpsert.title,
        blockToUpsert.companyName,
        blockToUpsert.location,
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

      await db?.query(insertExperienceChangelogQuery, [
        'upsert',
        JSON.stringify(omit(blockToUpsert, ['bulletPoints'])),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to save experience', error))
    }
  }

  async delete(blockId: string): Promise<Result<ExperienceBlockData[]>> {
    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const existingData = (await this.get()) as ExperienceBlockData[]
      const blockExists = existingData.find((item) => item.id === blockId)

      if (!blockExists) {
        return Failure(createValidationError('Experience block not found'))
      }

      await db?.query(deleteExperienceQuery, [blockId])

      await db?.query(reorderExperiencePositionsQuery, [timestamp])

      await db?.query(insertExperienceChangelogQuery, [
        'delete',
        JSON.stringify({ id: blockId }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to delete experience', error))
    }
  }

  async reorder(
    data: ExperienceBlockData[]
  ): Promise<Result<ExperienceBlockData[]>> {
    const validation = experienceBlockSchema.array().safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid experience data', validation.error)
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
        await db?.query(updateExperiencePositionQuery, [
          block.id,
          index,
          timestamp,
        ])
      }

      await db?.query(insertExperienceChangelogQuery, [
        'reorder',
        JSON.stringify(
          validation.data.map((item) => omit(item, ['bulletPoints']))
        ),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to reorder experience', error))
    }
  }

  async saveBullet(
    data: BulletPoint,
    sectionId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return this.saveBullets([data], sectionId)
  }

  async saveBullets(
    bullets: BulletPoint[],
    sectionId: string
  ): Promise<Result<ExperienceBlockData[]>> {
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
      const currentBulletsResult = await db?.query(getExperienceBulletsQuery, [
        sectionId,
      ])
      const currentBullets =
        (currentBulletsResult?.rows as RawExperienceBulletData[]) || []

      for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i]
        const existingBullet = currentBullets.find((b) => b.id === bullet.id)

        let position = bullet.position ?? 0

        if (!existingBullet) {
          position = currentBullets.length + i
        } else if (bullet.position === undefined) {
          position = existingBullet.position ?? 0
        }

        await db?.query(upsertExperienceBulletQuery, [
          bullet.id,
          sectionId,
          bullet.text,
          bullet.isLocked ?? false,
          position,
          timestamp,
        ])
      }

      const updatedBullets = await db?.query(getExperienceBulletsQuery, [
        sectionId,
      ])
      const translatedUpdatedBullets = (
        updatedBullets?.rows as RawExperienceBulletData[]
      ).map((b) => this.translateRawExperienceBullet(b))

      await db?.query(insertExperienceChangelogQuery, [
        'upsert_bullets',
        JSON.stringify({
          experienceId: sectionId,
          data: translatedUpdatedBullets,
        }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to save bullets', error))
    }
  }

  async deleteBullet(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return this.deleteBullets(sectionId, [bulletId])
  }

  async deleteBullets(
    sectionId: string,
    bulletIds: string[]
  ): Promise<Result<ExperienceBlockData[]>> {
    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const currentBulletsResult = await db?.query(getExperienceBulletsQuery, [
        sectionId,
      ])
      const currentBullets =
        (currentBulletsResult?.rows as RawExperienceBulletData[]) || []

      for (const bulletId of bulletIds) {
        const bulletExists = currentBullets.find((b) => b.id === bulletId)
        if (!bulletExists) {
          return Failure(
            createValidationError(`Bullet point ${bulletId} not found`)
          )
        }
      }

      await db?.query(`DELETE FROM experience_bullets WHERE id = ANY($1)`, [
        bulletIds,
      ])

      await db?.query(reorderExperienceBulletsQuery, [sectionId, timestamp])

      await db?.query(insertExperienceChangelogQuery, [
        'delete_bullets',
        JSON.stringify({ experienceId: sectionId, bulletIds }),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to delete bullets', error))
    }
  }

  async toggleBulletLock(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    // const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    // const currentUser = useAuthStore.getState().user
    // const userId = currentUser?.id || getLastKnownUserId()

    try {
      const currentBulletsResult = await db?.query(getExperienceBulletsQuery, [
        sectionId,
      ])
      const currentBullets =
        (currentBulletsResult?.rows as RawExperienceBulletData[]) || []
      const bullet = currentBullets.find((b) => b.id === bulletId)

      if (!bullet) {
        return Failure(createValidationError('Bullet point not found'))
      }

      const newLockState = !bullet.is_locked
      await db?.query(
        `UPDATE experience_bullets SET is_locked = $1, updated_at = $2 WHERE id = $3`,
        [newLockState, timestamp, bulletId]
      )

      // TODO: Log the change
      // await db?.query(insertExperienceChangelogQuery, [
      //   'toggle_bullet_lock',
      //   JSON.stringify({
      //     experienceId: sectionId,
      //     bulletId,
      //     isLocked: newLockState,
      //   }),
      //   writeId,
      //   timestamp,
      //   userId,
      // ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to toggle bullet lock', error))
    }
  }

  async toggleBulletLockAll(
    sectionId: string,
    shouldLock: boolean
  ): Promise<Result<ExperienceBlockData[]>> {
    // const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    // const currentUser = useAuthStore.getState().user
    // const userId = currentUser?.id || getLastKnownUserId()

    try {
      await db?.query(
        `UPDATE experience_bullets SET is_locked = $1, updated_at = $2 WHERE experience_id = $3`,
        [shouldLock, timestamp, sectionId]
      )

      // TODO: Log the change
      // await db?.query(insertExperienceChangelogQuery, [
      //   'toggle_bullets_lock_all',
      //   JSON.stringify({ experienceId: sectionId, shouldLock }),
      //   writeId,
      //   timestamp,
      //   userId,
      // ])

      const result = await db?.query(getExperienceQuery)
      const translatedResult = (result?.rows as RawExperienceData[]).map(
        (row) => this.translateRawExperience(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(
        createUnknownError('Failed to toggle all bullet locks', error)
      )
    }
  }
}

export const experienceManager = new ExperienceManager()
