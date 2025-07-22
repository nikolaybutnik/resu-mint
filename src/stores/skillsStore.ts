import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { Skills } from '@/lib/types/skills'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { SkillBlock } from '@/lib/types/skills'

interface SkillsStore {
  data: Skills
  loading: boolean
  initializing: boolean
  hasData: boolean
  resumeSkillData: SkillBlock[]
  hasResumeSkillData: boolean
  save: (skills: Skills) => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  saveSkillResumeData: (skillData: SkillBlock[]) => void
}

export const useSkillsStore = create<SkillsStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.SKILLS,
  loading: false,
  initializing: true,
  hasData: false,
  resumeSkillData: [],
  hasResumeSkillData: false,

  initialize: async () => {
    set({ loading: true })

    try {
      const skillData = (await dataManager.getSkills()) as Skills
      const resumeSkillsData =
        (await dataManager.getResumeSkills()) as SkillBlock[]

      set({
        data: skillData,
        loading: false,
        initializing: false,
        hasData:
          !!skillData?.hardSkills?.skills?.length ||
          !!skillData?.softSkills?.skills?.length,
        resumeSkillData: resumeSkillsData,
        hasResumeSkillData: !!resumeSkillsData?.length,
      })
    } catch (error) {
      console.error('SkillsStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  save: async (skills: Skills) => {
    const previousData = get().data

    set({
      data: skills,
      hasData:
        !!skills?.hardSkills?.skills?.length ||
        !!skills?.softSkills?.skills?.length,
    })

    try {
      await dataManager.saveSkills(skills)
    } catch (error) {
      set({
        data: previousData,
        hasData:
          !!previousData?.hardSkills?.skills?.length ||
          !!previousData?.softSkills?.skills?.length,
      })
      console.error('SkillsStore: save error:', error)
      throw error
    }
  },

  refresh: async () => {
    try {
      set({ loading: true })

      dataManager.invalidateSkills()
      dataManager.invalidateResumeSkills()

      const data = (await dataManager.getSkills()) as Skills
      const resumeSkillsData =
        (await dataManager.getResumeSkills()) as SkillBlock[]

      set({
        data,
        loading: false,
        hasData:
          !!data?.hardSkills?.skills?.length ||
          !!data?.softSkills?.skills?.length,
        resumeSkillData: resumeSkillsData,
        hasResumeSkillData: !!resumeSkillsData?.length,
      })
    } catch (error) {
      console.error('SkillsStore: refresh error:', error)
      set({ loading: false })
    }
  },

  saveSkillResumeData: async (resumeSkills: SkillBlock[]) => {
    const previousData = get().resumeSkillData

    set({
      resumeSkillData: resumeSkills,
      hasResumeSkillData: !!resumeSkills?.length,
    })

    try {
      await dataManager.saveResumeSkills(resumeSkills)
    } catch (error) {
      set({
        resumeSkillData: previousData,
        hasResumeSkillData: !!previousData?.length,
      })
      console.error('SkillsStore: save resume skills error:', error)
      throw error
    }
  },
}))
