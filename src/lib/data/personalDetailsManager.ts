import { STORAGE_KEYS } from '../constants'
import { PersonalDetails } from '../types/personalDetails'
import { personalDetailsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  PERSONAL_DETAILS_LOCAL: 'personalDetails-local',
  PERSONAL_DETAILS_API: 'personalDetails-api',
} as const

class PersonalDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(): Promise<PersonalDetails> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.PERSONAL_DETAILS_API
      : CACHE_KEYS.PERSONAL_DETAILS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<PersonalDetails>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_DETAILS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = personalDetailsSchema.safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid personal details in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.PERSONAL_DETAILS)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.PERSONAL_DETAILS)
          }
        } catch (error) {
          console.error(
            'Error loading personal details, using defaults:',
            error
          )
          resolve(DEFAULT_STATE_VALUES.PERSONAL_DETAILS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<PersonalDetails>
  }

  async save(data: PersonalDetails): Promise<void> {
    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.PERSONAL_DETAILS_API
        : CACHE_KEYS.PERSONAL_DETAILS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_DETAILS, JSON.stringify(data))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEYS.PERSONAL_DETAILS_LOCAL)
    this.cache.delete(CACHE_KEYS.PERSONAL_DETAILS_API)
  }
}

export const personalDetailsManager = new PersonalDetailsManager()
