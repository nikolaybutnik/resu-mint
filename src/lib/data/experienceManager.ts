import { STORAGE_KEYS } from '../constants'
import {
  ExperienceBlockData,
  BulletPoint,
  RawExperienceData,
  Month,
} from '../types/experience'
import { experienceBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  waitForAuthReady,
  writeLocalEnvelope,
  nowIso,
} from './dataUtils'
import {
  Result,
  Success,
  Failure,
  createStorageError,
  createValidationError,
  createUnknownError,
  createQuotaExceededError,
  isQuotaExceededError,
  OperationError,
  isNetworkError,
  createNetworkError,
} from '../types/errors'
import { pushExperienceLocalRecordToDb } from './dbUtils'
import { useAuthStore, useDbStore } from '@/stores'
import {
  getExperienceQuery,
  insertExperienceChangelogQuery,
  upsertExperienceQuery,
  deleteExperienceQuery,
  updateExperiencePositionQuery,
} from '../sql'
import { v4 as uuidv4 } from 'uuid'
import { getLastKnownUserId } from '../utils'

const CACHE_KEY = 'experience'

class ExperienceManager {
  private cache = new Map<string, Promise<unknown>>()

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
      bulletPoints: [], // TODO: Load from experience_bullets table
      isIncluded: raw.is_included ?? true,
      position: raw.position ?? 0,
      updatedAt: raw.updated_at || undefined,
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

  // TODO: phase out save as granular operations are being implemented.
  // save(): optimistic local write; then DB (if authed)
  async save(
    data: ExperienceBlockData[]
  ): Promise<Result<ExperienceBlockData[]>> {
    try {
      const validation = experienceBlockSchema.array().safeParse(data)

      if (!validation.success) {
        return Failure(
          createValidationError('Invalid experience data', validation.error)
        )
      }

      this.invalidate()

      // optimistic local write with timestamp
      try {
        writeLocalEnvelope(STORAGE_KEYS.EXPERIENCE, validation.data, nowIso())
      } catch (error) {
        if (isQuotaExceededError(error)) {
          return Failure(createQuotaExceededError(error))
        }
        return Failure(
          createStorageError('Failed to save to local storage', error)
        )
      }

      let syncWarning: OperationError | undefined

      // Background DB sync
      await waitForAuthReady()
      if (isAuthenticated()) {
        try {
          // Save each experience block with positions
          const withPositions = validation.data.map((block, i) => ({
            ...block,
            position: i,
            bulletPoints: (block.bulletPoints || []).map((bp, j) => ({
              ...bp,
              position: j,
            })),
          }))

          for (const block of withPositions) {
            const { updatedAt, error } = await pushExperienceLocalRecordToDb(
              block
            )

            if (error) {
              syncWarning = isNetworkError(error)
                ? createNetworkError('Failed to sync with server', error)
                : createUnknownError('Database sync failed', error)
              console.warn(
                'Database sync failed, but local save succeeded:',
                error
              )
            } else {
              // Sync succeeded - update local timestamp
              writeLocalEnvelope(
                STORAGE_KEYS.EXPERIENCE,
                withPositions,
                updatedAt ?? nowIso()
              )
            }
          }

          // TODO: Also save bullet points to experience_bullets table
          // This would require another upsert function for bullets
        } catch (error) {
          syncWarning = isNetworkError(error)
            ? createNetworkError('Failed to sync with server', error)
            : createUnknownError('Database sync failed', error)
          console.warn(
            'Failed to sync to database, but local save succeeded:',
            error
          )
        }
      }

      // Prime cache with saved value for immediate reads
      this.cache.set(CACHE_KEY, Promise.resolve(validation.data))

      return Success(validation.data, syncWarning)
    } catch (error) {
      return Failure(createUnknownError('Unexpected error during save', error))
    }
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
        JSON.stringify(blockToUpsert),
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
        JSON.stringify(validation.data),
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
    try {
      const existingExperience = (await this.get()) as ExperienceBlockData[]
      const experienceBlockToUpdate = existingExperience.find(
        (block) => block.id === sectionId
      )

      if (!experienceBlockToUpdate) {
        return Failure(createValidationError('Experience section not found'))
      }

      let updatedBulletPoints = experienceBlockToUpdate.bulletPoints || []

      const bulletExists = experienceBlockToUpdate.bulletPoints.some(
        (bullet) => bullet.id === data.id
      )

      if (bulletExists) {
        updatedBulletPoints = experienceBlockToUpdate.bulletPoints.map(
          (bullet) =>
            bullet.id === data.id
              ? {
                  id: data.id,
                  text: data.text,
                  isLocked: data.isLocked ?? false,
                  position: data.position ?? bullet.position ?? 0,
                }
              : bullet
        )
      } else {
        const nextPosition = updatedBulletPoints.length
        updatedBulletPoints.push({
          id: data.id,
          text: data.text,
          isLocked: data.isLocked ?? false,
          position: data.position ?? nextPosition,
        })
      }

      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: updatedBulletPoints }
          : block
      )

      return await this.save(updatedExperience)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullet save', error)
      )
    }
  }

  async saveBullets(
    bullets: BulletPoint[],
    sectionId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    try {
      const existingExperience = (await this.get()) as ExperienceBlockData[]
      const experienceBlockToUpdate = existingExperience.find(
        (block) => block.id === sectionId
      )

      if (!experienceBlockToUpdate) {
        return Failure(createValidationError('Experience section not found'))
      }

      const bulletsWithPositions = bullets.map((bullet, index) => ({
        ...bullet,
        position: bullet.position ?? index,
      }))

      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: bulletsWithPositions }
          : block
      )

      return await this.save(updatedExperience)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullets save', error)
      )
    }
  }

  async deleteBullet(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    try {
      const existingExperience = (await this.get()) as ExperienceBlockData[]
      const experienceBlockToUpdate = existingExperience.find(
        (block) => block.id === sectionId
      )

      if (!experienceBlockToUpdate) {
        return Failure(createValidationError('Experience section not found'))
      }

      const bulletExists = experienceBlockToUpdate.bulletPoints.find(
        (bullet) => bullet.id === bulletId
      )

      if (!bulletExists) {
        return Failure(createValidationError('Bullet point not found'))
      }

      const updatedBulletPoints = experienceBlockToUpdate.bulletPoints.filter(
        (bullet) => bullet.id !== bulletId
      )

      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: updatedBulletPoints }
          : block
      )

      return await this.save(updatedExperience)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullet deletion', error)
      )
    }
  }

  async toggleBulletLock(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    try {
      const existingExperience = (await this.get()) as ExperienceBlockData[]
      const experienceBlockToUpdate = existingExperience.find(
        (block) => block.id === sectionId
      )

      if (!experienceBlockToUpdate) {
        return Failure(createValidationError('Experience section not found'))
      }

      const bulletExists = experienceBlockToUpdate.bulletPoints.find(
        (bullet) => bullet.id === bulletId
      )

      if (!bulletExists) {
        return Failure(createValidationError('Bullet point not found'))
      }

      const updatedBulletPoints = experienceBlockToUpdate.bulletPoints.map(
        (bullet) =>
          bullet.id === bulletId
            ? { ...bullet, isLocked: !bullet.isLocked }
            : bullet
      )

      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: updatedBulletPoints }
          : block
      )

      return await this.save(updatedExperience)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullet lock toggle', error)
      )
    }
  }

  async toggleBulletLockAll(
    sectionId: string,
    shouldLock: boolean
  ): Promise<Result<ExperienceBlockData[]>> {
    try {
      const existingExperience = (await this.get()) as ExperienceBlockData[]
      const experienceBlockToUpdate = existingExperience.find(
        (block: ExperienceBlockData) => block.id === sectionId
      )

      if (!experienceBlockToUpdate) {
        return Failure(createValidationError('Experience section not found'))
      }

      const updatedBulletPoints = experienceBlockToUpdate.bulletPoints.map(
        (bullet: BulletPoint) => ({ ...bullet, isLocked: shouldLock })
      )

      const updatedExperience = existingExperience.map(
        (block: ExperienceBlockData) =>
          block.id === sectionId
            ? { ...block, bulletPoints: updatedBulletPoints }
            : block
      )

      return await this.save(updatedExperience)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bulk lock toggle', error)
      )
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEY)
  }
}

export const experienceManager = new ExperienceManager()
