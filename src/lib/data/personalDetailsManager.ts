import { STORAGE_KEYS } from '../constants'
import { PersonalDetails } from '../types/personalDetails'
import { personalDetailsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  waitForAuthReady,
  readLocalEnvelope,
  writeLocalEnvelope,
  nowIso,
} from './dataUtils'
import { supabase } from '../supabase/client'
import { useAuthStore } from '@/stores/authStore'
import {
  Result,
  Success,
  Failure,
  createNetworkError,
  createStorageError,
  createValidationError,
  createUnknownError,
  createQuotaExceededError,
  isQuotaExceededError,
  isNetworkError,
  OperationError,
} from '../types/errors'

const CACHE_KEY = 'personalDetails'

class PersonalDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  // get(): prefer local for fast reads, keep in sync with db
  async get(): Promise<PersonalDetails> {
    if (!this.cache.has(CACHE_KEY)) {
      const promise = new Promise<PersonalDetails>(async (resolve) => {
        // 1) Read local first (fast path)
        let localEnv = readLocalEnvelope<PersonalDetails>(
          STORAGE_KEYS.PERSONAL_DETAILS
        )

        // Migration: support legacy flat shape by wrapping it into an envelope once
        if (!localEnv && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.PERSONAL_DETAILS)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (parsed && typeof parsed === 'object' && !('meta' in parsed)) {
                const candidate = {
                  name: typeof parsed.name === 'string' ? parsed.name : '',
                  email: typeof parsed.email === 'string' ? parsed.email : '',
                  phone: typeof parsed.phone === 'string' ? parsed.phone : '',
                  location:
                    typeof parsed.location === 'string' ? parsed.location : '',
                  linkedin:
                    typeof parsed.linkedin === 'string' ? parsed.linkedin : '',
                  github:
                    typeof parsed.github === 'string' ? parsed.github : '',
                  website:
                    typeof parsed.website === 'string' ? parsed.website : '',
                } as PersonalDetails

                const migratedAt = nowIso()
                writeLocalEnvelope(
                  STORAGE_KEYS.PERSONAL_DETAILS,
                  candidate,
                  migratedAt
                )
                localEnv = { data: candidate, meta: { updatedAt: migratedAt } }
              }
            }
          } catch {
            // ignore invalid JSON
          }
        }

        const localData: PersonalDetails =
          localEnv?.data ?? DEFAULT_STATE_VALUES.PERSONAL_DETAILS
        const localUpdatedAt =
          localEnv?.meta?.updatedAt ?? '1970-01-01T00:00:00.000Z'

        // If auth is still initializing, return local immediately (avoid blocking UI)
        const authLoading = useAuthStore.getState().loading

        if (authLoading) {
          resolve(localData)
        }

        await waitForAuthReady()

        if (!isAuthenticated()) {
          resolve(localData)
          return
        }

        // 2) Try DB under RLS
        try {
          const { data, error } = await supabase
            .from('personal_details')
            .select(
              'name, email, phone, location, linkedin, github, website, updated_at'
            )
            .maybeSingle()

          if (!error && data) {
            const dbData: PersonalDetails = {
              name: data.name ?? '',
              email: data.email ?? '',
              phone: data.phone ?? '',
              location: data.location ?? '',
              linkedin: data.linkedin ?? '',
              github: data.github ?? '',
              website: data.website ?? '',
            }
            const dbUpdatedAt = data.updated_at ?? '1970-01-01T00:00:00.000Z'

            // Choose freshest
            const useDb = Date.parse(dbUpdatedAt) >= Date.parse(localUpdatedAt)
            const chosen = useDb ? dbData : localData
            const chosenUpdatedAt = useDb ? dbUpdatedAt : localUpdatedAt

            // Sync local data
            writeLocalEnvelope(
              STORAGE_KEYS.PERSONAL_DETAILS,
              chosen,
              chosenUpdatedAt
            )

            resolve(chosen)
            return
          }
        } catch {
          // fall through to local
        }

        // DB missing or error: fallback to local
        resolve(localData)
      })
      this.cache.set(CACHE_KEY, promise)
    }

    return this.cache.get(CACHE_KEY)! as Promise<PersonalDetails>
  }

  // save(): optimistic local write; then DB (if authed)
  async save(data: PersonalDetails): Promise<Result<PersonalDetails>> {
    try {
      const validation = personalDetailsSchema.safeParse(data)

      if (!validation.success) {
        return Failure(
          createValidationError(
            'Invalid personal details data',
            validation.error
          )
        )
      }

      this.invalidate()

      // optimistic local write with timestamp
      try {
        writeLocalEnvelope(
          STORAGE_KEYS.PERSONAL_DETAILS,
          validation.data,
          nowIso()
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
          const { data: updatedAt, error } = await supabase.rpc(
            'upsert_personal_details',
            {
              p_name: data.name,
              p_email: data.email,
              p_phone: data.phone ?? '',
              p_location: data.location ?? '',
              p_linkedin: data.linkedin ?? '',
              p_github: data.github ?? '',
              p_website: data.website ?? '',
            }
          )

          if (error) {
            // Create warning for sync failure
            syncWarning = isNetworkError(error)
              ? createNetworkError('Failed to sync with server', error)
              : createUnknownError('Database sync failed', error)
            console.warn(
              'Database sync failed, but local save succeeded:',
              error
            )
          } else {
            // Reflect server write locally only if sync succeeded
            writeLocalEnvelope(
              STORAGE_KEYS.PERSONAL_DETAILS,
              validation.data,
              updatedAt ?? nowIso()
            )
          }
        } catch (error) {
          // Network/DB errors are non-blocking since we have local data
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

  invalidate() {
    this.cache.delete(CACHE_KEY)
  }
}

export const personalDetailsManager = new PersonalDetailsManager()
