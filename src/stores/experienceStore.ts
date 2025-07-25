import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { ExperienceBlockData } from '@/lib/types/experience'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface ExperienceStore {
  data: ExperienceBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  save: (data: ExperienceBlockData[]) => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: ExperienceBlockData[]) => boolean
}

export const useExperienceStore = create<ExperienceStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.EXPERIENCE,
  loading: false,
  initializing: true,
  hasData: false,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = (await dataManager.getExperience()) as ExperienceBlockData[]
      set({
        data,
        loading: false,
        initializing: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('ExperienceStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  save: async (data: ExperienceBlockData[]) => {
    const previousData = get().data

    set({ data, hasData: !!data?.length })

    try {
      await dataManager.saveExperience(data)
    } catch (error) {
      set({ data: previousData, hasData: !!previousData?.length })
      console.error('ExperienceStore: save error:', error)
      throw error
    }
  },

  refresh: async () => {
    try {
      set({ loading: true })
      dataManager.invalidateExperience()
      const data = (await dataManager.getExperience()) as ExperienceBlockData[]
      set({
        data,
        loading: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('ExperienceStore: refresh error:', error)
      set({ loading: false })
    }
  },

  hasChanges: (newData: ExperienceBlockData[]) => {
    const currentData = get().data
    return JSON.stringify(currentData) !== JSON.stringify(newData)
  },
}))
