import { STORAGE_KEYS } from '../constants'
import { AppSettings } from '../types/settings'
import { settingsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  SETTINGS_LOCAL: 'settings-local',
  SETTINGS_API: 'settings-api',
} as const

class SettingsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(): Promise<AppSettings> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.SETTINGS_API
      : CACHE_KEYS.SETTINGS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<AppSettings>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = settingsSchema.safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid settings in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.SETTINGS)
            }
          } else {
            this.save(DEFAULT_STATE_VALUES.SETTINGS)
            resolve(DEFAULT_STATE_VALUES.SETTINGS)
          }
        } catch (error) {
          console.error('Error loading settings, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.SETTINGS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<AppSettings>
  }

  async save(data: AppSettings): Promise<void> {
    const validation = settingsSchema.safeParse(data)
    if (!validation.success) {
      console.error('Invalid settings data, save aborted:', validation.error)
      throw new Error('Invalid settings data')
    }

    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.SETTINGS_API
        : CACHE_KEYS.SETTINGS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(validation.data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
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
    this.cache.delete(CACHE_KEYS.SETTINGS_LOCAL)
    this.cache.delete(CACHE_KEYS.SETTINGS_API)
  }
}

export const settingsManager = new SettingsManager()
