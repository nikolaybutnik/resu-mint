import { STORAGE_KEYS } from '../constants'
import { PersonalDetails } from '../types/personalDetails'

const CACHE_KEYS = {
  PERSONAL_DETAILS_LOCAL: 'personalDetails-local',
  PERSONAL_DETAILS_API: 'personalDetails-api',
  // EDUCATION_LOCAL: 'education-local',
  // EDUCATION_API: 'education-api',
  // EXPERIENCE_LOCAL: 'experience-local',
  // EXPERIENCE_API: 'experience-api',
} as const

type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]

type CacheableData = PersonalDetails | null
// | EducationBlockData[]
// | ExperienceBlockData[]
// | ProjectBlockData[]
// | SkillsData

type PersonalDetailsData = Extract<CacheableData, PersonalDetails | null>

class DataManager {
  private cache = new Map<CacheKey, Promise<unknown>>()

  private isAuthenticated(): boolean {
    // TODO: Implement when auth system is ready
    return false // Always use localStorage for now
  }

  getPersonalDetails(): Promise<PersonalDetails | null> {
    const cacheKey = this.isAuthenticated()
      ? CACHE_KEYS.PERSONAL_DETAILS_API
      : CACHE_KEYS.PERSONAL_DETAILS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<PersonalDetails | null>((resolve) => {
        const stored = localStorage.getItem(STORAGE_KEYS.PERSONAL_DETAILS)
        resolve(stored ? JSON.parse(stored) : null)
      })
      this.cache.set(cacheKey, promise)
    }

    return this.cache.get(cacheKey)! as Promise<PersonalDetailsData>
  }

  async savePersonalDetails(data: PersonalDetails): Promise<void> {
    // TODO: Route to API when authenticated
    localStorage.setItem(STORAGE_KEYS.PERSONAL_DETAILS, JSON.stringify(data))
    this.invalidatePersonalDetails()
  }

  invalidatePersonalDetails() {
    this.cache.delete(CACHE_KEYS.PERSONAL_DETAILS_LOCAL)
    this.cache.delete(CACHE_KEYS.PERSONAL_DETAILS_API)
  }
}

export const dataManager = new DataManager()
