import { STORAGE_KEYS } from '../constants'
import { ExperienceBlockData, BulletPoint } from '../types/experience'
import { experienceBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  EXPERIENCE_LOCAL: 'experience-local',
  EXPERIENCE_API: 'experience-api',
} as const

class ExperienceManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(
    sectionId?: string
  ): Promise<ExperienceBlockData | ExperienceBlockData[] | undefined> {
    const cacheKey = isAuthenticated()
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
              resolve(DEFAULT_STATE_VALUES.EXPERIENCE)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.EXPERIENCE)
          }
        } catch (error) {
          console.error('Error loading work experience, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.EXPERIENCE)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    const allExperience = await (this.cache.get(cacheKey)! as Promise<
      ExperienceBlockData[]
    >)

    // If sectionId provided, return specific section
    if (sectionId) {
      return allExperience.find((block) => block.id === sectionId)
    }

    // Otherwise return all sections
    return allExperience
  }

  async save(data: ExperienceBlockData[]): Promise<void> {
    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.EXPERIENCE_API
        : CACHE_KEYS.EXPERIENCE_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(STORAGE_KEYS.EXPERIENCE, JSON.stringify(data))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async saveBullet(data: BulletPoint, sectionId: string) {
    const existingExperience = (await this.get()) as ExperienceBlockData[]
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
      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(updatedExperience)
      )

      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async saveBullets(bullets: BulletPoint[], sectionId: string) {
    const existingExperience = (await this.get()) as ExperienceBlockData[]

    try {
      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId ? { ...block, bulletPoints: bullets } : block
      )
      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(updatedExperience)
      )

      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async deleteBullet(sectionId: string, bulletId: string) {
    const existingExperience = (await this.get()) as ExperienceBlockData[]
    const experienceBlockToUpdate = existingExperience.find(
      (block) => block.id === sectionId
    )
    const bulletAlreadyExists = !!experienceBlockToUpdate?.bulletPoints.find(
      (bullet) => bullet.id === bulletId
    )

    if (!bulletAlreadyExists) {
      throw new Error('Bullet not found')
    }

    const updatedBulletPoints = experienceBlockToUpdate?.bulletPoints.filter(
      (bullet) => bullet.id !== bulletId
    )

    const updatedExperience = existingExperience.map((block) =>
      block.id === sectionId
        ? { ...block, bulletPoints: updatedBulletPoints }
        : block
    )

    try {
      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(updatedExperience)
      )
      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEYS.EXPERIENCE_LOCAL)
    this.cache.delete(CACHE_KEYS.EXPERIENCE_API)
  }
}

export const experienceManager = new ExperienceManager()
