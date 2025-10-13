import { useDbStore } from '@/stores/dbStore'
import { DEFAULT_STATE_VALUES } from '../constants'
import { getSkillsQuery } from '../sql'
import {
  RawSkills,
  // SkillBlock,
  Skills,
} from '../types/skills'
// import {
//   resumeSkillBlockSchema,
//   skillsValidationSchema,
// } from '../validationSchemas'

class SkillsManager {
  private translateRawSkills(raw: RawSkills): Skills {
    return {
      id: raw.id,
      hardSkills: {
        skills: raw.hard_skills,
        suggestions: raw.hard_suggestions,
      },
      softSkills: {
        skills: raw.soft_skills,
        suggestions: raw.soft_suggestions,
      },
      updatedAt: raw.updated_at,
    }
  }

  async getSkills(): Promise<Skills> {
    const { db } = useDbStore.getState()

    const data = await db?.query<RawSkills>(getSkillsQuery)

    if (!data?.rows?.length) {
      return DEFAULT_STATE_VALUES.SKILLS
    }

    const [storedData] = data.rows

    return this.translateRawSkills(storedData)
  }
  // private cache = new Map<string, Promise<unknown>>()

  // async getSkills(): Promise<Skills> {
  //   const cacheKey = isAuthenticated()
  //     ? CACHE_KEYS.SKILLS_API
  //     : CACHE_KEYS.SKILLS_LOCAL

  //   if (!this.cache.has(cacheKey)) {
  //     const promise = new Promise<Skills>((resolve) => {
  //       try {
  //         const stored = localStorage.getItem(STORAGE_KEYS.SKILLS)

  //         if (stored) {
  //           const parsed = JSON.parse(stored)
  //           const validation = skillsValidationSchema.safeParse(parsed)
  //           if (validation.success) {
  //             resolve(validation.data)
  //           } else {
  //             console.warn(
  //               'Invalid skills in Local Storage, using defaults:',
  //               validation.error
  //             )
  //             resolve(DEFAULT_STATE_VALUES.SKILLS)
  //           }
  //         } else {
  //           resolve(DEFAULT_STATE_VALUES.SKILLS)
  //         }
  //       } catch (error) {
  //         console.error('Error loading skills, using defaults:', error)
  //         resolve(DEFAULT_STATE_VALUES.SKILLS)
  //       }
  //     })
  //     this.cache.set(cacheKey, promise)
  //   }

  //   return this.cache.get(cacheKey)! as Promise<Skills>
  // }

  // async saveSkills(data: Skills): Promise<void> {
  //   const validation = skillsValidationSchema.safeParse(data)
  //   if (!validation.success) {
  //     console.error('Invalid skills data, save aborted:', validation.error)
  //     throw new Error('Invalid skills data')
  //   }

  //   this.invalidateSkills()

  //   if (!isLocalStorageAvailable()) {
  //     console.warn(
  //       'Local Storage not available, data will not persist across sessions'
  //     )

  //     const cacheKey = isAuthenticated()
  //       ? CACHE_KEYS.SKILLS_API
  //       : CACHE_KEYS.SKILLS_LOCAL

  //     this.cache.set(cacheKey, Promise.resolve(validation.data))
  //     return
  //   }

  //   try {
  //     localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(validation.data))
  //   } catch (error) {
  //     throw error
  //   }
  // }

  // invalidateSkills() {
  //   this.cache.delete(CACHE_KEYS.SKILLS_LOCAL)
  //   this.cache.delete(CACHE_KEYS.SKILLS_API)
  // }

  // async getResumeSkills(): Promise<SkillBlock[]> {
  //   const cacheKey = isAuthenticated()
  //     ? CACHE_KEYS.SKILLS_RESUME_API
  //     : CACHE_KEYS.SKILLS_RESUME_LOCAL

  //   if (!this.cache.has(cacheKey)) {
  //     const promise = new Promise<SkillBlock[]>((resolve) => {
  //       try {
  //         const stored = localStorage.getItem(STORAGE_KEYS.RESUME_SKILLS)

  //         if (stored) {
  //           const parsed = JSON.parse(stored)
  //           const validation = resumeSkillBlockSchema.array().safeParse(parsed)

  //           if (validation.success) {
  //             resolve(validation.data)
  //           } else {
  //             console.warn(
  //               'Invalid resume skills in Local Storage, using defaults:',
  //               validation.error
  //             )
  //             resolve(DEFAULT_STATE_VALUES.RESUME_SKILLS)
  //           }
  //         } else {
  //           resolve(DEFAULT_STATE_VALUES.RESUME_SKILLS)
  //         }
  //       } catch (error) {
  //         console.error('Error loading resume skills, using defaults:', error)
  //         resolve(DEFAULT_STATE_VALUES.RESUME_SKILLS)
  //       }
  //     })
  //     this.cache.set(cacheKey, promise)
  //   }

  //   return this.cache.get(cacheKey)! as Promise<SkillBlock[]>
  // }

  // async saveResumeSkills(data: SkillBlock[]): Promise<void> {
  //   const validation = resumeSkillBlockSchema.array().safeParse(data)
  //   if (!validation.success) {
  //     console.error(
  //       'Invalid resume skills data, save aborted:',
  //       validation.error
  //     )
  //     throw new Error('Invalid resume skills data')
  //   }

  //   this.invalidateResumeSkills()

  //   if (!isLocalStorageAvailable()) {
  //     console.warn(
  //       'Local Storage not available, data will not persist across sessions'
  //     )

  //     const cacheKey = isAuthenticated()
  //       ? CACHE_KEYS.SKILLS_RESUME_API
  //       : CACHE_KEYS.SKILLS_RESUME_LOCAL

  //     this.cache.set(cacheKey, Promise.resolve(validation.data))
  //     return
  //   }

  //   try {
  //     localStorage.setItem(
  //       STORAGE_KEYS.RESUME_SKILLS,
  //       JSON.stringify(validation.data)
  //     )
  //   } catch (error) {
  //     throw error
  //   }
  // }

  // invalidateResumeSkills() {
  //   this.cache.delete(CACHE_KEYS.SKILLS_RESUME_LOCAL)
  //   this.cache.delete(CACHE_KEYS.SKILLS_RESUME_API)
  // }
}

export const skillsManager = new SkillsManager()
