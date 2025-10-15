import { useDbStore } from '@/stores/dbStore'
import { DEFAULT_STATE_VALUES } from '../constants'
import { getResumeSkillsQuery, getSkillsQuery } from '../sql'
import { RawResumeSkills, RawSkills, SkillBlock, Skills } from '../types/skills'
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

  private translateRawResumeSkills(raw: RawResumeSkills[]): SkillBlock[] {
    return raw.map((skill) => ({
      id: skill.id,
      title: skill.title,
      skills: skill.skills,
      isIncluded: skill.is_included,
      position: skill.position,
      updatedAt: skill.updated_at,
    }))
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

  async getResumeSkills(): Promise<SkillBlock[]> {
    const { db } = useDbStore.getState()

    const data = await db?.query<RawResumeSkills>(getResumeSkillsQuery)

    if (!data?.rows?.length) {
      return DEFAULT_STATE_VALUES.RESUME_SKILLS
    }

    const storedData = data.rows

    return this.translateRawResumeSkills(storedData)
  }

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
}

export const skillsManager = new SkillsManager()
