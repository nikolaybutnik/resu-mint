import { STORAGE_KEYS } from '../constants'
import { EducationBlockData } from '../types/education'
import { educationBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  EDUCATION_LOCAL: 'education-local',
  EDUCATION_API: 'education-api',
} as const

class EducationManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(
    sectionId?: string
  ): Promise<EducationBlockData | EducationBlockData[] | undefined> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.EDUCATION_API
      : CACHE_KEYS.EDUCATION_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<EducationBlockData[]>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.EDUCATION)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = educationBlockSchema.array().safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid education in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.EDUCATION)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.EDUCATION)
          }
        } catch (error) {
          console.error('Error loading education, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.EDUCATION)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    const allEducation = await (this.cache.get(cacheKey)! as Promise<
      EducationBlockData[]
    >)

    if (sectionId) {
      return allEducation.find((block) => block.id === sectionId)
    }

    return allEducation
  }

  async save(data: EducationBlockData[]): Promise<void> {
    const validation = educationBlockSchema.array().safeParse(data)
    if (!validation.success) {
      console.error('Invalid education data, save aborted:', validation.error)
      throw new Error('Invalid education data')
    }

    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.EDUCATION_API
        : CACHE_KEYS.EDUCATION_LOCAL

      this.cache.set(cacheKey, Promise.resolve(validation.data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.EDUCATION,
        JSON.stringify(validation.data)
      )
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEYS.EDUCATION_LOCAL)
    this.cache.delete(CACHE_KEYS.EDUCATION_API)
  }
}

export const educationManager = new EducationManager()
