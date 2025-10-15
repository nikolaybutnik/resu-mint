import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { Skills } from '@/lib/types/skills'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { SkillBlock } from '@/lib/types/skills'
import { createUnknownError, OperationError } from '@/lib/types/errors'
import { debounce, isEqual, omit } from 'lodash'

interface SkillsStore {
  skillsData: Skills
  resumeSkillsData: SkillBlock[]
  loading: boolean
  initializing: boolean
  hasSkillsData: boolean
  hasResumeSkillData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  upsertSkills: (skills: Skills) => Promise<{ error: OperationError | null }>
  // saveResumeSkills: (resumeSkills: SkillBlock[]) => Promise<void>
  refresh: () => Promise<void>
  skillsHaveChanges: (newData: Skills) => boolean
  clearError: () => void
}

let debouncedSkillsSave: ReturnType<typeof debounce> | null = null
// let debouncedResumeSkillsSave: ReturnType<typeof debounce> | null = null
let lastSavedSkillsState: Skills = DEFAULT_STATE_VALUES.SKILLS
// let lastSavedResumeSkillsState: SkillBlock[] =
//   DEFAULT_STATE_VALUES.RESUME_SKILLS
let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const useSkillsStore = create<SkillsStore>((set, get) => {
  if (!debouncedSkillsSave) {
    debouncedSkillsSave = debounce(async (skills: Skills) => {
      set({ loading: true, error: null })

      const result = await dataManager.saveSkills(skills)

      if (result.success) {
        lastSavedSkillsState = result.data
        set({
          skillsData: result.data,
          loading: false,
          hasSkillsData:
            !!result.data?.hardSkills?.skills?.length ||
            !!result.data?.softSkills?.skills?.length,
          error: null,
        })
      } else {
        set({
          loading: false,
          skillsData: lastSavedSkillsState,
          hasSkillsData:
            !!lastSavedSkillsState?.hardSkills?.skills?.length ||
            !!lastSavedSkillsState?.softSkills?.skills?.length,
          error: result.error,
        })
      }
    }, 1000)
  }

  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true, error: null })
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        lastSavedSkillsState = skillsData
        set({
          skillsData,
          resumeSkillsData,
          loading: false,
          hasSkillsData:
            !!skillsData?.hardSkills?.skills?.length ||
            !!skillsData?.softSkills?.skills?.length,
          hasResumeSkillData: !!resumeSkillsData?.length,
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
    hasSkillsData: false,
    hasResumeSkillData: false,
    error: null,

    initialize: async () => {
      set({ loading: true, error: null })
      try {
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        lastSavedSkillsState = skillsData

        set({
          skillsData,
          resumeSkillsData,
          loading: false,
          initializing: false,
          hasSkillsData:
            !!skillsData?.hardSkills?.skills?.length ||
            !!skillsData?.softSkills?.skills?.length,
          hasResumeSkillData: !!resumeSkillsData?.length,
        })
      } catch (error) {
        set({
          loading: false,
          initializing: false,
          error: createUnknownError('Failed to initialize skills data', error),
        })
      }
    },

    upsertSkills: async (skillsData: Skills) => {
      const currentState = get()

      if (!currentState.skillsHaveChanges(skillsData)) {
        return { error: null }
      }

      set({
        skillsData,
        hasSkillsData:
          !!skillsData?.hardSkills?.skills?.length ||
          !!skillsData?.softSkills?.skills?.length,
        error: null,
      })

      debouncedSkillsSave?.(skillsData)

      return { error: null }
    },

    skillsHaveChanges: (newData: Skills) => {
      const currentData = omit(get().skillsData, ['id', 'updatedAt'])
      const incomingData = omit(newData, ['id', 'updatedAt'])
      return !isEqual(currentData, incomingData)
    },

    refresh: async () => {
      debouncedRefresh?.()
    },

    clearError: () => {
      set({ error: null })
    },
  }
})
