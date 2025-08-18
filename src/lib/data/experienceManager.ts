import { STORAGE_KEYS } from '../constants'
import { ExperienceBlockData, BulletPoint } from '../types/experience'
import { experienceBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  waitForAuthReady,
  readLocalEnvelope,
  writeLocalEnvelope,
  nowIso,
} from './dataUtils'
import { useAuthStore } from '@/stores/authStore'
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
import { supabase } from '../supabase/client'

const CACHE_KEY = 'experience'

class ExperienceManager {
  private cache = new Map<string, Promise<unknown>>()

  // get(): prefer local for fast reads, keep in sync with db
  async get(
    sectionId?: string
  ): Promise<ExperienceBlockData | ExperienceBlockData[] | undefined> {
    if (!this.cache.has(CACHE_KEY)) {
      const promise = new Promise<ExperienceBlockData[]>(async (resolve) => {
        // 1) Read local first (fast path)
        let localEnv = readLocalEnvelope<ExperienceBlockData[]>(
          STORAGE_KEYS.EXPERIENCE
        )

        // Migration: support legacy flat shape by wrapping it into an envelope once
        if (!localEnv && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.EXPERIENCE)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed) && !('meta' in parsed)) {
                const validation = experienceBlockSchema
                  .array()
                  .safeParse(parsed)
                if (validation.success) {
                  const migratedAt = nowIso()
                  writeLocalEnvelope(
                    STORAGE_KEYS.EXPERIENCE,
                    validation.data,
                    migratedAt
                  )
                  localEnv = {
                    data: validation.data,
                    meta: { updatedAt: migratedAt },
                  }
                }
              }
            }
          } catch {
            // ignore invalid JSON
          }
        }

        const localData: ExperienceBlockData[] =
          localEnv?.data ?? DEFAULT_STATE_VALUES.EXPERIENCE
        // const localUpdatedAt =
        //   localEnv?.meta?.updatedAt ?? '1970-01-01T00:00:00.000Z'

        const authLoading = useAuthStore.getState().loading

        if (authLoading) {
          resolve(localData)
        }

        await waitForAuthReady()

        if (!isAuthenticated()) {
          resolve(localData)
          return
        }

        // 2) Try DB under RLS (experience data will be stored in a table later)
        // For now, just return local data since we don't have experience table yet
        // TODO: Add experience table sync when DB schema is ready

        // When loaded, ensure proper ordering:
        // const ordered = (loaded || [])
        //   .slice()
        //   .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        // ordered.forEach(
        //   (b) =>
        //     (b.bulletPoints = (b.bulletPoints || [])
        //       .slice()
        //       .sort((x, y) => (x.position ?? 0) - (y.position ?? 0)))
        // )
        // return ordered

        // try {
        //   const { data, error } = await supabase.from('experience').select()
        //   console.log('data', data)
        //   console.log('error', error)
        // } catch {
        //   // fall through to local
        // }

        resolve(localData)
      })
      this.cache.set(CACHE_KEY, promise)
    }

    const allExperience = (await (this.cache.get(CACHE_KEY)! as Promise<
      ExperienceBlockData[]
    >)) as ExperienceBlockData[]

    if (sectionId) {
      return allExperience.find((block) => block.id === sectionId)
    }

    return allExperience
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
            const { data: updatedAt, error } = await supabase.rpc(
              'upsert_experience',
              {
                e_id: block.id,
                e_title: block.title,
                e_company_name: block.companyName,
                e_location: block.location,
                e_start_month: block.startDate.month ?? '',
                e_start_year: Number(block.startDate.year),
                e_end_month: block.endDate.month ?? '',
                e_end_year: Number(block.endDate.year),
                e_is_present: block.endDate.isPresent,
                e_description: block.description || '',
                e_is_included: block.isIncluded,
                e_position: block.position || 0,
              }
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

  // upsert(): optimistic local write; then DB (if authed)
  async upsert(
    block: ExperienceBlockData
  ): Promise<Result<ExperienceBlockData[]>> {
    try {
      const validation = experienceBlockSchema.safeParse(block)

      if (!validation.success) {
        return Failure(
          createValidationError('Invalid experience data', validation.error)
        )
      }

      const existingData = (await this.get()) as ExperienceBlockData[]
      const blockIndex = existingData.findIndex((item) => item.id === block.id)

      let updatedData: ExperienceBlockData[]
      if (blockIndex >= 0) {
        // Update existing
        updatedData = existingData.map((item) =>
          item.id === block.id ? validation.data : item
        )
      } else {
        // Add new
        updatedData = [...existingData, validation.data]
      }

      this.invalidate()

      // Optimistic local write
      try {
        writeLocalEnvelope(STORAGE_KEYS.EXPERIENCE, updatedData, nowIso())
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
          const { data: updatedAt, error } = await supabase.rpc(
            'upsert_experience',
            {
              e_id: block.id,
              e_title: block.title,
              e_company_name: block.companyName,
              e_location: block.location,
              e_start_month: block.startDate.month ?? '',
              e_start_year: Number(block.startDate.year),
              e_end_month: block.endDate.month ?? '',
              e_end_year: Number(block.endDate.year),
              e_is_present: block.endDate.isPresent,
              e_description: block.description || '',
              e_is_included: block.isIncluded,
              e_position: block.position || 0,
            }
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
              updatedData,
              updatedAt ?? nowIso()
            )
          }
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

      // Prime cache
      this.cache.set(CACHE_KEY, Promise.resolve(updatedData))

      return Success(updatedData, syncWarning)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during upsert', error)
      )
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
                }
              : bullet
        )
      } else {
        updatedBulletPoints.push({
          id: data.id,
          text: data.text,
          isLocked: data.isLocked ?? false,
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

      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId ? { ...block, bulletPoints: bullets } : block
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
