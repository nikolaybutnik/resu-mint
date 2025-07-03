import { STORAGE_KEYS } from '../constants'
import { BulletPoint, ExperienceBlockData } from '../types/experience'
import { PersonalDetails } from '../types/personalDetails'
import {
  experienceBlockSchema,
  personalDetailsSchema,
} from '../validationSchemas'

const DEFAULT_PERSONAL_DETAILS: PersonalDetails = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
}

const DEFAULT_EXPERIENCE: ExperienceBlockData[] = []

const CACHE_KEYS = {
  PERSONAL_DETAILS_LOCAL: 'personalDetails-local',
  PERSONAL_DETAILS_API: 'personalDetails-api',
  EXPERIENCE_LOCAL: 'experience-local',
  EXPERIENCE_API: 'experience-api',
} as const

type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]

class DataManager {
  private cache = new Map<CacheKey, Promise<unknown>>()

  private isAuthenticated(): boolean {
    // TODO: Implement when auth system is ready
    return false // Always use localStorage for now
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  private isQuotaExceededError(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    )
  }

  getPersonalDetails(): Promise<PersonalDetails> {
    const cacheKey = this.isAuthenticated()
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
              resolve(DEFAULT_PERSONAL_DETAILS)
            }
          } else {
            resolve(DEFAULT_PERSONAL_DETAILS)
          }
        } catch (error) {
          console.error(
            'Error loading personal details, using defaults:',
            error
          )
          resolve(DEFAULT_PERSONAL_DETAILS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<PersonalDetails>
  }

  async savePersonalDetails(data: PersonalDetails): Promise<void> {
    // TODO: Route to API when authenticated

    this.invalidatePersonalDetails()

    if (!this.isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = this.isAuthenticated()
        ? CACHE_KEYS.PERSONAL_DETAILS_API
        : CACHE_KEYS.PERSONAL_DETAILS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_DETAILS, JSON.stringify(data))
    } catch (error) {
      if (this.isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidatePersonalDetails() {
    this.cache.delete(CACHE_KEYS.PERSONAL_DETAILS_LOCAL)
    this.cache.delete(CACHE_KEYS.PERSONAL_DETAILS_API)
  }

  async getExperience(): Promise<ExperienceBlockData[]> {
    const cacheKey = this.isAuthenticated()
      ? CACHE_KEYS.EXPERIENCE_API
      : CACHE_KEYS.EXPERIENCE_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<ExperienceBlockData[]>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.EXPERIENCE)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = experienceBlockSchema.array().safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid work experience in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_EXPERIENCE)
            }
          } else {
            resolve(DEFAULT_EXPERIENCE)
          }
        } catch (error) {
          console.error('Error loading work experience, using defaults:', error)
          resolve(DEFAULT_EXPERIENCE)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<ExperienceBlockData[]>
  }

  async saveExperience(data: ExperienceBlockData[]): Promise<void> {
    this.invalidateExperience()

    if (!this.isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = this.isAuthenticated()
        ? CACHE_KEYS.EXPERIENCE_API
        : CACHE_KEYS.EXPERIENCE_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(STORAGE_KEYS.EXPERIENCE, JSON.stringify(data))
    } catch (error) {
      if (this.isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidateExperience() {
    this.cache.delete(CACHE_KEYS.EXPERIENCE_LOCAL)
    this.cache.delete(CACHE_KEYS.EXPERIENCE_API)
  }

  async saveExperienceBullet(data: BulletPoint, sectionId: string) {
    console.log('dataManager: saveExperienceBullet called:', {
      data,
      sectionId,
    })

    const existingExperience = await this.getExperience()
    console.log('dataManager: existing experience:', existingExperience)
    const experienceBlockToUpdate = existingExperience.find(
      (block) => block.id === sectionId
    )
    const bulletAlreadyExists = !!experienceBlockToUpdate?.bulletPoints.find(
      (bullet) => bullet.id === data.id
    )

    let updatedBulletPoints = experienceBlockToUpdate?.bulletPoints || []

    if (bulletAlreadyExists && experienceBlockToUpdate) {
      updatedBulletPoints = experienceBlockToUpdate?.bulletPoints.map(
        (bullet) => (bullet.id === data.id ? data : bullet)
      )
    } else {
      updatedBulletPoints.push({
        id: data.id,
        text: data.text,
        isLocked: data.isLocked,
      })
    }

    try {
      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: updatedBulletPoints }
          : block
      )
      console.log('dataManager: saving updated experience:', updatedExperience)
      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(updatedExperience)
      )

      // Invalidate cache after saving to ensure fresh data on next read
      this.invalidateExperience()
      console.log('dataManager: bullet saved and cache invalidated')
    } catch (error) {
      if (this.isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }
}

export const dataManager = new DataManager()
