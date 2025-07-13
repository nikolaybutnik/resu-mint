import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { EducationBlockData } from '@/lib/types/education'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface EducationStore {
  data: EducationBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  save: (data: EducationBlockData[]) => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: EducationBlockData[]) => boolean
}

export const useEducationStore = create<EducationStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.EDUCATION,
  loading: false,
  initializing: true,
  hasData: false,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = (await dataManager.getEducation()) as EducationBlockData[]
      set({
        data,
        loading: false,
        initializing: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('EducationStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  save: async (data: EducationBlockData[]) => {
    const previousData = get().data

    set({ data, hasData: !!data?.length })

    try {
      await dataManager.saveEducation(data)
    } catch (error) {
      set({ data: previousData, hasData: !!previousData?.length })
      console.error('EducationStore: save error:', error)
      throw error
    }
  },

  refresh: async () => {
    try {
      set({ loading: true })
      dataManager.invalidateEducation()
      const data = (await dataManager.getEducation()) as EducationBlockData[]
      set({
        data,
        loading: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('EducationStore: refresh error:', error)
      set({ loading: false })
    }
  },

  hasChanges: (newData: EducationBlockData[]) => {
    const currentData = get().data
    return JSON.stringify(currentData) !== JSON.stringify(newData)
  },
}))
