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

    if (sectionId) {
      return allExperience.find((block) => block.id === sectionId)
    }

    return allExperience
  }

  async save(data: ExperienceBlockData[]): Promise<void> {
    const validation = experienceBlockSchema.array().safeParse(data)
    if (!validation.success) {
      console.error('Invalid experience data, save aborted:', validation.error)
      throw new Error('Invalid experience data')
    }

    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.EXPERIENCE_API
        : CACHE_KEYS.EXPERIENCE_LOCAL

      this.cache.set(cacheKey, Promise.resolve(validation.data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
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

  async saveBullet(data: BulletPoint, sectionId: string) {
    const existingExperience = (await this.get()) as ExperienceBlockData[]
    const experienceBlockToUpdate = existingExperience.find(
      (block) => block.id === sectionId
    )

    let updatedBulletPoints = experienceBlockToUpdate?.bulletPoints || []

    const bulletExists = experienceBlockToUpdate?.bulletPoints.some(
      (bullet) => bullet.id === data.id
    )

    if (bulletExists) {
      updatedBulletPoints =
        experienceBlockToUpdate?.bulletPoints.map((bullet) =>
          bullet.id === data.id
            ? {
                id: data.id,
                text: data.text,
                isLocked: data.isLocked ?? false,
              }
            : bullet
        ) || []
    } else {
      updatedBulletPoints.push({
        id: data.id,
        text: data.text,
        isLocked: data.isLocked ?? false,
      })
    }

    try {
      const updatedExperience = existingExperience.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: updatedBulletPoints }
          : block
      )

      const validation = experienceBlockSchema
        .array()
        .safeParse(updatedExperience)
      if (!validation.success) {
        console.error(
          'Invalid experience data after bullet update, save aborted:',
          validation.error
        )
        throw new Error('Invalid experience data')
      }

      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(validation.data)
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

      const validation = experienceBlockSchema
        .array()
        .safeParse(updatedExperience)
      if (!validation.success) {
        console.error(
          'Invalid experience data after bullets update, save aborted:',
          validation.error
        )
        throw new Error('Invalid experience data')
      }

      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(validation.data)
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
      const validation = experienceBlockSchema
        .array()
        .safeParse(updatedExperience)
      if (!validation.success) {
        console.error(
          'Invalid experience data after bullet deletion, save aborted:',
          validation.error
        )
        throw new Error('Invalid experience data')
      }

      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(validation.data)
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

  async toggleBulletLock(sectionId: string, bulletId: string) {
    const existingExperience = (await this.get()) as ExperienceBlockData[]
    const experienceBlockToUpdate = existingExperience.find(
      (block) => block.id === sectionId
    )
    const updatedBulletPoints = experienceBlockToUpdate?.bulletPoints.map(
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

    try {
      const validation = experienceBlockSchema
        .array()
        .safeParse(updatedExperience)
      if (!validation.success) {
        console.error(
          'Invalid experience data after bullet lock toggle, save aborted:',
          validation.error
        )
        throw new Error('Invalid experience data')
      }

      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(validation.data)
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

  async toggleBulletLockAll(sectionId: string, shouldLock: boolean) {
    const existingExperience = (await this.get()) as ExperienceBlockData[]
    const experienceBlockToUpdate = existingExperience.find(
      (block) => block.id === sectionId
    )
    const updatedBulletPoints = experienceBlockToUpdate?.bulletPoints.map(
      (bullet) => ({ ...bullet, isLocked: shouldLock })
    )
    const updatedExperience = existingExperience.map((block) =>
      block.id === sectionId
        ? { ...block, bulletPoints: updatedBulletPoints }
        : block
    )

    try {
      const validation = experienceBlockSchema
        .array()
        .safeParse(updatedExperience)
      if (!validation.success) {
        console.error(
          'Invalid experience data after bulk lock toggle, save aborted:',
          validation.error
        )
        throw new Error('Invalid experience data')
      }

      localStorage.setItem(
        STORAGE_KEYS.EXPERIENCE,
        JSON.stringify(validation.data)
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
