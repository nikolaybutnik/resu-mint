import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { Skills } from '@/lib/types/skills'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface SkillsStore {
  data: Skills
  loading: boolean
  initializing: boolean
  hasData: boolean
  save: (skills: Skills) => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
}

export const useSkillsStore = create<SkillsStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.SKILLS,
  loading: false,
  initializing: true,
  hasData: false,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = (await dataManager.getSkills()) as Skills
      set({
        data,
        loading: false,
        initializing: false,
        hasData:
          !!data?.hardSkills?.skills?.length ||
          !!data?.softSkills?.skills?.length,
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
      const data = (await dataManager.getSkills()) as Skills
      set({
        data,
        loading: false,
        hasData:
          !!data?.hardSkills?.skills?.length ||
          !!data?.softSkills?.skills?.length,
      })
    } catch (error) {
      console.error('SkillsStore: refresh error:', error)
      set({ loading: false })
    }
  },
}))
