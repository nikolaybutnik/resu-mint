import { STORAGE_KEYS } from '../constants'
import { DEFAULT_STATE_VALUES } from '../constants'
import { JobDescriptionAnalysis } from '../types/jobDetails'
import { JobDetails } from '../types/jobDetails'
import { jobDetailsSchema } from '../validationSchemas'
import { isAuthenticated, isLocalStorageAvailable } from './dataUtils'

const CACHE_KEYS = {
  JOB_DETAILS_LOCAL: 'job-details-local',
  JOB_DETAILS_API: 'job-details-api',
} as const

class JobDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(): Promise<JobDetails> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.JOB_DETAILS_API
      : CACHE_KEYS.JOB_DETAILS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<JobDetails>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.JOB_DETAILS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = jobDetailsSchema.safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid job details in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.JOB_DETAILS)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.JOB_DETAILS)
          }
        } catch (error) {
          console.error('Error loading job details, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.JOB_DETAILS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    return await (this.cache.get(cacheKey)! as Promise<JobDetails>)
  }

  async saveJobDescription(data: string): Promise<void> {
    const updatedJobDetails = {
      ...(await this.get()),
      originalJobDescription: data,
    }

    const validation = jobDetailsSchema.safeParse(updatedJobDetails)
    if (!validation.success) {
      console.error(
        'Invalid job details after description update, save aborted:',
        validation.error
      )
      throw new Error('Invalid job details data')
    }

    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.JOB_DETAILS_API
        : CACHE_KEYS.JOB_DETAILS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(validation.data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.JOB_DETAILS,
        JSON.stringify(validation.data)
      )
    } catch (error) {
      throw error
    }
  }

  async saveAnalysis(data: JobDescriptionAnalysis): Promise<void> {
    const updatedJobDetails = {
      ...(await this.get()),
      analysis: data,
    }

    const validation = jobDetailsSchema.safeParse(updatedJobDetails)
    if (!validation.success) {
      console.error(
        'Invalid job details after analysis update, save aborted:',
        validation.error
      )
      throw new Error('Invalid job details data')
    }

    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.JOB_DETAILS_API
        : CACHE_KEYS.JOB_DETAILS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(validation.data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.JOB_DETAILS,
        JSON.stringify(validation.data)
      )
    } catch (error) {
      throw error
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEYS.JOB_DETAILS_LOCAL)
    this.cache.delete(CACHE_KEYS.JOB_DETAILS_API)
  }
}

export const jobDetailsManager = new JobDetailsManager()
