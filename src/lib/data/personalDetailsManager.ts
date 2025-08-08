import { STORAGE_KEYS } from '../constants'
import { PersonalDetails } from '../types/personalDetails'
import { personalDetailsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isQuotaExceededError,
  waitForAuthReady,
  readLocalEnvelope,
  writeLocalEnvelope,
  nowIso,
} from './dataUtils'
import { supabase } from '../supabase/client'
import { useAuthStore } from '@/stores/authStore'

const CACHE_KEY = 'personalDetails'

class PersonalDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  // get(): prefer DB if authed; fallback to local; keep local in sync
  async get(): Promise<PersonalDetails> {
    if (!this.cache.has(CACHE_KEY)) {
      const promise = new Promise<PersonalDetails>(async (resolve) => {
        // 1) Read local first (fast path)
        const localEnv = readLocalEnvelope<PersonalDetails>(
          STORAGE_KEYS.PERSONAL_DETAILS
        )

        let localData: PersonalDetails =
          localEnv?.data ?? DEFAULT_STATE_VALUES.PERSONAL_DETAILS
        const localUpdatedAt =
          localEnv?.meta?.updatedAt ?? '1970-01-01T00:00:00.000Z'

        // If auth is still initializing, return local immediately (avoid blocking UI)
        const authLoading = useAuthStore.getState().loading
        if (authLoading) {
          resolve(localData)
          return
        }

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
  async save(data: PersonalDetails): Promise<void> {
    const validation = personalDetailsSchema.safeParse(data)

    if (!validation.success) {
      throw new Error('Invalid personal details data')
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
      if (isQuotaExceededError(error)) throw new Error('Storage quota exceeded')
      throw error
    }

    await waitForAuthReady()
    if (isAuthenticated()) {
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

      if (error) throw error

      // Reflect server write locally
      writeLocalEnvelope(
        STORAGE_KEYS.PERSONAL_DETAILS,
        validation.data,
        updatedAt ?? nowIso()
      )
    }

    // Prime cache with saved value for immediate reads
    this.cache.set(CACHE_KEY, Promise.resolve(validation.data))
  }

  invalidate() {
    this.cache.delete(CACHE_KEY)
  }
}

export const personalDetailsManager = new PersonalDetailsManager()
