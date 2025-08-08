import { STORAGE_KEYS } from '../constants'
import { PersonalDetails } from '../types/personalDetails'
import { personalDetailsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isQuotaExceededError,
  waitForAuthReady,
} from './dataUtils'
import { supabase } from '../supabase/client'

const CACHE_KEY = 'personalDetails'

class PersonalDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  // get(): prefer DB if authed; fallback to local; keep local in sync
  async get(): Promise<PersonalDetails> {
    if (!this.cache.has(CACHE_KEY)) {
      const promise = new Promise<PersonalDetails>(async (resolve) => {
        await waitForAuthReady()

        let localData: PersonalDetails = DEFAULT_STATE_VALUES.PERSONAL_DETAILS

        try {
          const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_DETAILS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = personalDetailsSchema.safeParse(parsed)

            if (validation.success) localData = validation.data
          }
        } catch {}

        if (!isAuthenticated()) {
          resolve(localData)
          return
        }

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

          // TODO: implement method to choose freshest data
          const chosen = dbData

          // Sync local data
          try {
            localStorage.setItem(
              STORAGE_KEYS.PERSONAL_DETAILS,
              JSON.stringify(chosen)
            )
          } catch {}

          resolve(chosen)
          return
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

    // optimistic local write
    try {
      localStorage.setItem(
        STORAGE_KEYS.PERSONAL_DETAILS,
        JSON.stringify(validation.data)
      )
    } catch (error) {
      if (isQuotaExceededError(error)) throw new Error('Storage quota exceeded')
      throw error
    }

    await waitForAuthReady()
    if (isAuthenticated()) {
      const { error } = await supabase.rpc('upsert_personal_details', {
        p_name: data.name,
        p_email: data.email,
        p_phone: data.phone ?? '',
        p_location: data.location ?? '',
        p_linkedin: data.linkedin ?? '',
        p_github: data.github ?? '',
        p_website: data.website ?? '',
      })
      if (error) throw error
    }

    // Prime cache with saved value for immediate reads
    this.cache.set(CACHE_KEY, Promise.resolve(validation.data))
  }

  invalidate() {
    this.cache.delete(CACHE_KEY)
  }
}

export const personalDetailsManager = new PersonalDetailsManager()
