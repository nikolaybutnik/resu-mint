import { DEFAULT_STATE_VALUES } from '../constants'
import { SkillBlock, Skills } from '../types/skills'
import { STORAGE_KEYS } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'
import {
  resumeSkillBlockSchema,
  skillsValidationSchema,
} from '../validationSchemas'

const CACHE_KEYS = {
  SKILLS_LOCAL: 'skills-local',
  SKILLS_API: 'skills-api',
  SKILLS_RESUME_LOCAL: 'skills-resume-local',
  SKILLS_RESUME_API: 'skills-resume-api',
} as const

class SkillsManager {
  private cache = new Map<string, Promise<unknown>>()

  async getSkills(): Promise<Skills> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.SKILLS_API
      : CACHE_KEYS.SKILLS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<Skills>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.SKILLS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = skillsValidationSchema.safeParse(parsed)
            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid skills in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.SKILLS)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.SKILLS)
          }
        } catch (error) {
          console.error('Error loading skills, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.SKILLS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<Skills>
  }

  async saveSkills(data: Skills): Promise<void> {
    this.invalidateSkills()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.SKILLS_API
        : CACHE_KEYS.SKILLS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(data))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidateSkills() {
    this.cache.delete(CACHE_KEYS.SKILLS_LOCAL)
    this.cache.delete(CACHE_KEYS.SKILLS_API)
  }

  async getResume(): Promise<SkillBlock[]> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.SKILLS_RESUME_API
      : CACHE_KEYS.SKILLS_RESUME_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<SkillBlock[]>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.RESUME_SKILLS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = resumeSkillBlockSchema.array().safeParse(parsed)
            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid resume skills in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.RESUME_SKILLS)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.RESUME_SKILLS)
          }
        } catch (error) {
          console.error('Error loading resume skills, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.RESUME_SKILLS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<SkillBlock[]>
  }

  async saveResumeSkills(data: SkillBlock[]): Promise<void> {
    this.invalidateResumeSkills()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.SKILLS_RESUME_API
        : CACHE_KEYS.SKILLS_RESUME_LOCAL

      this.cache.set(cacheKey, Promise.resolve(data))
      return
    }

    try {
      localStorage.setItem(STORAGE_KEYS.RESUME_SKILLS, JSON.stringify(data))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidateResumeSkills() {
    this.cache.delete(CACHE_KEYS.SKILLS_RESUME_LOCAL)
    this.cache.delete(CACHE_KEYS.SKILLS_RESUME_API)
  }
}

export const skillsManager = new SkillsManager()
