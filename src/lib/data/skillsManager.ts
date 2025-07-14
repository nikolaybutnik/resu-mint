import { DEFAULT_STATE_VALUES } from '../constants'
import { Skills } from '../types/skills'
import { STORAGE_KEYS } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  SKILLS_LOCAL: 'skills-local',
  SKILLS_API: 'skills-api',
} as const

class SkillsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(): Promise<Skills> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.SKILLS_API
      : CACHE_KEYS.SKILLS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<Skills>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.SKILLS)

          // TODO: Create validation schema for skills
          if (stored) {
            // const parsed = JSON.parse(stored)
            // const validation = skillsSchema.safeParse(parsed)
            // if (validation.success) {
            //   resolve(validation.data)
            // } else {
            //   console.warn(
            //     'Invalid skills in Local Storage, using defaults:',
            //     validation.error
            //   )
            //   resolve(DEFAULT_STATE_VALUES.SKILLS)
            // }
          } else {
            this.save(DEFAULT_STATE_VALUES.SKILLS)
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

  async save(data: Skills): Promise<void> {
    this.invalidate()

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

  invalidate() {
    this.cache.delete(CACHE_KEYS.SKILLS_LOCAL)
    this.cache.delete(CACHE_KEYS.SKILLS_API)
  }
}

export const skillsManager = new SkillsManager()
