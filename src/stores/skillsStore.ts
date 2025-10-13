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
  // save: (skills: Skills) => Promise<void>
  // refresh: () => Promise<void>
  // saveResumeSkillsData: (skillData: SkillBlock[]) => Promise<void>
  // clearError: () => void
}

let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const useSkillsStore = create<SkillsStore>((set, _get) => {
  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true, error: null })
        const data = (await dataManager.getSkills()) as Skills
        // const resumeSkillsData =
        //   (await dataManager.getResumeSkills()) as SkillBlock[]
        set({
          skillsData: data,
          resumeSkillsData: [],
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
        // const resumeSkillsData =
        //   (await dataManager.getResumeSkills()) as SkillBlock[]
        console.log('skillsData', skillsData)

        set({
          skillsData: skillsData,
          resumeSkillsData: [],
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
  }
  // data: DEFAULT_STATE_VALUES.SKILLS,
  // loading: false,
  // initializing: true,
  // hasData: false,
  // resumeSkillData: [],
  // hasResumeSkillData: false,
  // initialize: async () => {
  //   set({ loading: true })
  //   try {
  //     const skillsData = (await dataManager.getSkills()) as Skills
  //     const resumeSkillsData =
  //       (await dataManager.getResumeSkills()) as SkillBlock[]
  //     set({
  //       data: skillsData,
  //       loading: false,
  //       initializing: false,
  //       hasData:
  //         !!skillsData?.hardSkills?.skills?.length ||
  //         !!skillsData?.softSkills?.skills?.length,
  //       resumeSkillData: resumeSkillsData,
  //       hasResumeSkillData: !!resumeSkillsData?.length,
  //     })
  //   } catch (error) {
  //     console.error('SkillsStore: initialization error:', error)
  //     set({ loading: false, initializing: false })
  //   }
  // },
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
  // refresh: async () => {
  //   try {
  //     set({ loading: true })
  //     dataManager.invalidateSkills()
  //     dataManager.invalidateResumeSkills()
  //     const data = (await dataManager.getSkills()) as Skills
  //     const resumeSkillsData =
  //       (await dataManager.getResumeSkills()) as SkillBlock[]
  //     set({
  //       data,
  //       loading: false,
  //       hasData:
  //         !!data?.hardSkills?.skills?.length ||
  //         !!data?.softSkills?.skills?.length,
  //       resumeSkillData: resumeSkillsData,
  //       hasResumeSkillData: !!resumeSkillsData?.length,
  //     })
  //   } catch (error) {
  //     console.error('SkillsStore: refresh error:', error)
  //     set({ loading: false })
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
