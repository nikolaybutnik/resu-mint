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
  getMostRecentTimestamp,
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
import {
  pullExperienceDbRecordToLocal,
  pushExperienceLocalRecordToDb,
} from './dbUtils'

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
                  const migratedData = validation.data.map((block) => ({
                    ...block,
                    updatedAt: migratedAt,
                  }))
                  writeLocalEnvelope(
                    STORAGE_KEYS.EXPERIENCE,
                    migratedData,
                    migratedAt
                  )
                  localEnv = {
                    data: migratedData,
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
        const localUpdatedAt =
          localEnv?.meta?.updatedAt ?? '1970-01-01T00:00:00.000Z'

        const authLoading = useAuthStore.getState().loading

        if (authLoading) {
          resolve(localData)
        }

        await waitForAuthReady()

        if (!isAuthenticated()) {
          resolve(localData)
          return
        }

        // 2) Try DB fetch and merge (downstream sync)
        let finalData: ExperienceBlockData[] = localData
        // let dbDataRaw: RawExperienceData[] | null = null
        try {
          const { data, error } = await supabase.from('experience').select(`
              id, title, company_name, location, description, 
              start_year, start_month, is_present, end_year, end_month, 
              is_included, position, updated_at,
              experience_bullets(id, text, is_locked, position, updated_at)
            `)

          // TODO: handle the fetched experience_bullets

          if (!error && data) {
            // dbDataRaw = data
            const dbData: ExperienceBlockData[] = await Promise.all(
              data.map((block) => pullExperienceDbRecordToLocal(block))
            )

            const mergedData = localData.map((localItem) => {
              const dbItem = dbData.find((db) => db.id === localItem.id)
              if (!dbItem) {
                return {
                  ...localItem,
                  updatedAt: localItem.updatedAt ?? localUpdatedAt,
                }
              }

              const localTimestamp =
                localItem.updatedAt || '1970-01-01T00:00:00.000Z'
              const dbTimestamp = dbItem.updatedAt || '1970-01-01T00:00:00.000Z'

              if (Date.parse(dbTimestamp) >= Date.parse(localTimestamp)) {
                return dbItem
              } else {
                return { ...localItem, updatedAt: localTimestamp }
              }
            })

            const newDbItems = dbData.filter(
              (dbItem) =>
                !localData.some((localItem) => localItem.id === dbItem.id)
            )

            finalData = [...mergedData, ...newDbItems]

            finalData = finalData
              .slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          }
        } catch {
          // Fall through to local data
        }

        // 3) Opportunistic upstream sync: Push local-only or modified blocks to DB
        // if (isAuthenticated()) {
        //   try {
        // const updatedData = [...finalData]
        // let maxUpdatedAt = '1970-01-01T00:00:00.000Z'
        // let didSync = false
        // for (let i = 0; i < updatedData.length; i++) {
        // const block = updatedData[i]
        // const dbMatch = dbDataRaw?.find((d) => d.id === block.id)
        // const localTimestamp = block.updatedAt ?? localUpdatedAt
        // const dbTimestamp =
        //   dbMatch?.updated_at || '1970-01-01T00:00:00.000Z'
        // Sync if: local-only (no DB match) or local-modified (local timestamp newer)
        // if (
        //   !dbMatch ||
        //   Date.parse(localTimestamp) > Date.parse(dbTimestamp)
        // ) {
        //   const { updatedAt, error } =
        //     await pushExperienceLocalRecordToDb(block)
        //   if (error) {
        //     // Continue to avoid blocking
        //   } else {
        //     didSync = true
        //     const newTimestamp = updatedAt ?? nowIso()
        //     updatedData[i] = { ...block, updatedAt: newTimestamp }
        //     if (Date.parse(newTimestamp) > Date.parse(maxUpdatedAt)) {
        //       maxUpdatedAt = newTimestamp
        //     }
        //   }
        // }
        // }
        // Cleanup db records which have been deleted locally
        // for (const dbItem of dbDataRaw || []) {
        //   if (!localData.some((local) => local.id === dbItem.id)) {
        //     const result = await supabase
        //       .from('experience')
        //       .delete()
        //       .eq('id', dbItem.id)
        //     if (result.status !== 204) {
        //       // Non-blocking error
        //       console.error(
        //         'Background cleanup of DB experience data failed: ',
        //         result.error
        //       )
        //     }
        //   }
        // }
        // Update localStorage if we synced anything
        // if (didSync) {
        //   this.invalidate()
        //   const allTimestamps = updatedData
        //     .map((b) => b.updatedAt || '1970-01-01T00:00:00.000Z')
        //     .concat(localUpdatedAt)
        //   const mostRecentTimestamp = allTimestamps.reduce(
        //     (latest, current) =>
        //       Date.parse(current) > Date.parse(latest) ? current : latest,
        //     '1970-01-01T00:00:00.000Z'
        //   )
        //   writeLocalEnvelope(
        //     STORAGE_KEYS.EXPERIENCE,
        //     updatedData,
        //     mostRecentTimestamp
        //   )
        //   finalData = updatedData
        // }
        // } catch {
        //   // Non-blocking
        // }
        // }

        resolve(finalData)
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

      // Fetch current full data (leverages cache/merge/sync from get())
      const existingData = (await this.get()) as ExperienceBlockData[]
      const blockIndex = existingData.findIndex((item) => item.id === block.id)

      let updatedData: ExperienceBlockData[]
      if (blockIndex >= 0) {
        const updatedBlock = {
          ...validation.data,
          position:
            validation.data.position ?? existingData[blockIndex].position ?? 0,
          updatedAt: validation.data.updatedAt,
        }
        updatedData = existingData.map((item) =>
          item.id === block.id ? updatedBlock : item
        )
      } else {
        const newBlock = {
          ...validation.data,
          position: existingData.length,
        }
        updatedData = [...existingData, newBlock]
      }

      updatedData = updatedData
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

      this.invalidate()

      // Optimistic local write
      const tempTimestamp = nowIso()
      const tempUpdatedData = updatedData.map((item) =>
        item.id === block.id ? { ...item, updatedAt: tempTimestamp } : item
      )

      try {
        writeLocalEnvelope(
          STORAGE_KEYS.EXPERIENCE,
          tempUpdatedData,
          tempTimestamp
        )
      } catch (error) {
        if (isQuotaExceededError(error)) {
          return Failure(createQuotaExceededError(error))
        }
        return Failure(
          createStorageError('Failed to save to local storage', error)
        )
      }

      let syncWarning: OperationError | undefined

      await waitForAuthReady()
      if (isAuthenticated()) {
        try {
          const { updatedAt, error } = await pushExperienceLocalRecordToDb({
            ...block,
            position: existingData.length,
          })

          if (error) {
            syncWarning = isNetworkError(error)
              ? createNetworkError('Failed to sync with server', error)
              : createUnknownError('Database sync failed', error)
            console.warn(
              'Database sync failed, but local save succeeded:',
              error
            )
          } else {
            const newTimestamp = updatedAt ?? nowIso()
            const finalUpdatedData = updatedData.map((item) =>
              item.id === block.id ? { ...item, updatedAt: newTimestamp } : item
            )

            writeLocalEnvelope(
              STORAGE_KEYS.EXPERIENCE,
              finalUpdatedData,
              newTimestamp
            )
          }
        } catch (error) {
          syncWarning = isNetworkError(error)
            ? createNetworkError('Failed to sync with server', error)
            : createUnknownError('Database sync failed', error)
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

  async delete(blockId: string): Promise<Result<ExperienceBlockData[]>> {
    try {
      const existingData = (await this.get()) as ExperienceBlockData[]
      const blockExists = existingData.find((item) => item.id === blockId)

      if (!blockExists) {
        return Failure(createValidationError('Experience block not found'))
      }

      const updatedData = existingData.filter((item) => item.id !== blockId)

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
          const { data: deletedAt, error } = await supabase.rpc(
            'delete_experience',
            {
              e_ids: [blockId],
            }
          )

          if (error) {
            syncWarning = isNetworkError(error)
              ? createNetworkError('Failed to sync with server', error)
              : createUnknownError('Database sync failed', error)
            console.warn(
              'Database sync failed, but local delete succeeded:',
              error
            )
          } else {
            // Sync succeeded - update local timestamp
            writeLocalEnvelope(
              STORAGE_KEYS.EXPERIENCE,
              updatedData,
              deletedAt ?? nowIso()
            )
          }
        } catch (error) {
          syncWarning = isNetworkError(error)
            ? createNetworkError('Failed to sync with server', error)
            : createUnknownError('Database sync failed', error)
          console.warn(
            'Failed to sync delete to database, but local delete succeeded:',
            error
          )
        }
      }

      // Prime cache
      this.cache.set(CACHE_KEY, Promise.resolve(updatedData))

      return Success(updatedData, syncWarning)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during delete', error)
      )
    }
  }

  async reorder(
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

      const reorderedData = validation.data.map((block, index) => ({
        ...block,
        position: index,
        updatedAt: nowIso(),
      }))
      const latestTimestamp = getMostRecentTimestamp(reorderedData)

      try {
        writeLocalEnvelope(
          STORAGE_KEYS.EXPERIENCE,
          validation.data,
          latestTimestamp
        )
      } catch (error) {
        if (isQuotaExceededError(error)) {
          return Failure(createQuotaExceededError(error))
        }
        return Failure(
          createStorageError('Failed to save to local storage', error)
        )
      }

      let syncWarning: OperationError | undefined

      await waitForAuthReady()
      if (isAuthenticated()) {
        try {
          for (const block of reorderedData) {
            const { updatedAt, error } = await pushExperienceLocalRecordToDb(
              block
            )

            if (error) {
              syncWarning = isNetworkError(error)
                ? createNetworkError(`Failed to sync block ${block.id}`, error)
                : createUnknownError(
                    `Database sync failed for block ${block.id}`,
                    error
                  )
            } else {
              writeLocalEnvelope(
                STORAGE_KEYS.EXPERIENCE,
                reorderedData,
                updatedAt ?? nowIso()
              )
            }
          }
        } catch (error) {
          syncWarning = isNetworkError(error)
            ? createNetworkError(
                'Failed to sync reordered data to server',
                error
              )
            : createUnknownError('Database sync failed', error)
          console.warn('Failed to sync reordered data to DB:', error)
        }
      }

      this.cache.set(CACHE_KEY, Promise.resolve(reorderedData))

      return Success(reorderedData, syncWarning)
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during reorder', error)
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
