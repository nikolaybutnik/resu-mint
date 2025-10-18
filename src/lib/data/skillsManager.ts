import { useDbStore } from '@/stores/dbStore'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  getResumeSkillsQuery,
  getSkillsQuery,
  upsertSkillsQuery,
  insertSkillsChangelogQuery,
  upsertResumeSkillQuery,
} from '../sql'
import { RawResumeSkills, RawSkills, SkillBlock, Skills } from '../types/skills'
import {
  resumeSkillBlockSchema,
  skillsValidationSchema,
} from '../validationSchemas'
import {
  Result,
  Success,
  Failure,
  createValidationError,
  createUnknownError,
} from '../types/errors'
import { nowIso } from './dataUtils'
import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '@/stores'
import { getLastKnownUserId } from '../utils'

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

  async saveSkills(data: Skills): Promise<Result<Skills>> {
    const validation = skillsValidationSchema.safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid skills data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      await db?.query(upsertSkillsQuery, [
        validation.data.id,
        validation.data.hardSkills.skills,
        validation.data.hardSkills.suggestions,
        validation.data.softSkills.skills,
        validation.data.softSkills.suggestions,
        timestamp,
      ])

      await db?.query(insertSkillsChangelogQuery, [
        'update_skills',
        JSON.stringify(validation.data),
        writeId,
        timestamp,
        userId,
      ])
    } catch (error) {
      return Failure(createUnknownError('Failed to save skills', error))
    }

    const updatedData: Skills = await this.getSkills()

    return Success(updatedData)
  }

  async saveResumeSkillBlock(block: SkillBlock): Promise<Result<SkillBlock[]>> {
    const validation = resumeSkillBlockSchema.safeParse(block)

    if (!validation.success) {
      return Failure(
        createValidationError(
          'Invalid resume skill block data',
          validation.error
        )
      )
    }

    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    // const currentUser = useAuthStore.getState().user
    // const userId = currentUser?.id || getLastKnownUserId()
    // const writeId = uuidv4()

    try {
      await db?.query(upsertResumeSkillQuery, [
        validation.data.id,
        validation.data.title,
        validation.data.skills,
        validation.data.isIncluded,
        validation.data.position,
        timestamp,
      ])

      // await db?.query(insertResumeSkillChangelogQuery, [
      //   'update_resume_skills',
      //   JSON.stringify(validation.data),
      //   writeId,
      //   timestamp,
      //   userId,
      // ])
    } catch (error) {
      return Failure(
        createUnknownError('Failed to save resume skill block', error)
      )
    }

    const updatedData: SkillBlock[] = await this.getResumeSkills()

    return Success(updatedData)
  }

  // async deleteResumeSkillBlock(blockId: string): Promise<Result<SkillBlock[]>> {
  //   const { db } = useDbStore.getState()

  //   try {
  //     await db?.query(deleteResumeSkillQuery, [blockId])
  //   } catch (error) {
  //     console.log(error)
  //     return Failure(
  //       createUnknownError('Failed to delete resume skill block', error)
  //     )
  //   }

  //   const updatedData: SkillBlock[] = await this.getResumeSkills()

  //   return Success(updatedData)
  // }

  // async reorderResumeSkillBlocks(
  //   blocks: SkillBlock[]
  // ): Promise<Result<SkillBlock[]>> {
  //   const validation = resumeSkillBlockSchema.array().safeParse(blocks)

  //   if (!validation.success) {
  //     return Failure(
  //       createValidationError('Invalid resume skills data', validation.error)
  //     )
  //   }

  //   const timestamp = nowIso()
  //   const { db } = useDbStore.getState()

  //   try {
  //     for (const block of validation.data) {
  //       await db?.query(upsertResumeSkillQuery, [
  //         block.id,
  //         block.title,
  //         block.skills,
  //         block.isIncluded,
  //         block.position,
  //         timestamp,
  //       ])
  //     }
  //   } catch (error) {
  //     console.log(error)
  //     return Failure(
  //       createUnknownError('Failed to reorder resume skill blocks', error)
  //     )
  //   }

  //   const updatedData: SkillBlock[] = await this.getResumeSkills()

  //   return Success(updatedData)
  // }
}

export const skillsManager = new SkillsManager()
