import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { Skills } from '@/lib/types/skills'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { SkillBlock } from '@/lib/types/skills'
import { createUnknownError, OperationError } from '@/lib/types/errors'
import { debounce } from 'lodash'

interface SkillsStore {
  skillsData: Skills
  resumeSkillsData: SkillBlock[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  hasResumeSkillData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  // saveSkills: (skills: Skills) => Promise<void>
  // saveResumeSkills: (resumeSkills: SkillBlock[]) => Promise<void>
  refresh: () => Promise<void>
  clearError: () => void
}

let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const useSkillsStore = create<SkillsStore>((set, get) => {
  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true, error: null })
        const data = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        set({
          skillsData: data,
          resumeSkillsData: resumeSkillsData,
          loading: false,
          hasData:
            !!data?.hardSkills?.skills?.length ||
            !!data?.softSkills?.skills?.length,
          hasResumeSkillData: !![]?.length,
        })
      } catch (error) {
        set({
          loading: false,
          error: createUnknownError('Failed to refresh skills data', error),
        })
      }
    }, 300)
  }

  return {
    skillsData: DEFAULT_STATE_VALUES.SKILLS,
    resumeSkillsData: [],
    loading: false,
    initializing: true,
    hasData: false,
    hasResumeSkillData: false,
    error: null,

    initialize: async () => {
      set({ loading: true, error: null })
      try {
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]

        set({
          skillsData: skillsData,
          resumeSkillsData: resumeSkillsData,
          loading: false,
          initializing: false,
          hasData:
            !!skillsData?.hardSkills?.skills?.length ||
            !!skillsData?.softSkills?.skills?.length,
          hasResumeSkillData: !![]?.length,
        })
      } catch (error) {
        set({
          loading: false,
          initializing: false,
          error: createUnknownError('Failed to initialize skills data', error),
        })
      }
    },

    refresh: async () => {
      debouncedRefresh?.()
    },

    clearError: () => {
      set({ error: null })
    },
  }

  // save: async (skills: Skills) => {
  //   const previousData = get().data
  //   set({
  //     data: skills,
  //     hasData:
  //       !!skills?.hardSkills?.skills?.length ||
  //       !!skills?.softSkills?.skills?.length,
  //   })
  //   try {
  //     await dataManager.saveSkills(skills)
  //   } catch (error) {
  //     set({
  //       data: previousData,
  //       hasData:
  //         !!previousData?.hardSkills?.skills?.length ||
  //         !!previousData?.softSkills?.skills?.length,
  //     })
  //     console.error('SkillsStore: save error:', error)
  //     throw error
  //   }
  // },
  // saveResumeSkillsData: async (resumeSkills: SkillBlock[]) => {
  //   set({ loading: true })
  //   const previousData = get().resumeSkillData
  //   set({
  //     resumeSkillData: resumeSkills,
  //     hasResumeSkillData: !!resumeSkills?.length,
  //   })
  //   try {
  //     await dataManager.saveResumeSkills(resumeSkills)
  //   } catch (error) {
  //     set({
  //       resumeSkillData: previousData,
  //       hasResumeSkillData: !!previousData?.length,
  //     })
  //     console.error('SkillsStore: save resume skills error:', error)
  //     throw error
  //   }
  // },
})
