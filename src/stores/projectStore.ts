import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { ProjectBlockData } from '@/lib/types/projects'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface ProjectStore {
  data: ProjectBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  save: (data: ProjectBlockData[]) => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: ProjectBlockData[]) => boolean
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.PROJECTS,
  loading: false,
  initializing: true,
  hasData: false,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = (await dataManager.getProjects()) as ProjectBlockData[]
      set({
        data,
        loading: false,
        initializing: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('ProjectStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  save: async (data: ProjectBlockData[]) => {
    const currentState = get()

    if (!currentState.hasChanges(data)) {
      console.info('No changes in form, skipping save')
      return
    }

    const previousData = get().data

    set({ data, hasData: !!data?.length })

    try {
      await dataManager.saveProjects(data)
    } catch (error) {
      set({ data: previousData, hasData: !!previousData?.length })
      console.error('ProjectStore: save error:', error)
      throw error
    }
  },

  refresh: async () => {
    try {
      set({ loading: true })
      dataManager.invalidateProjects()
      const data = (await dataManager.getProjects()) as ProjectBlockData[]
      set({
        data,
        loading: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('ProjectStore: refresh error:', error)
      set({ loading: false })
    }
  },

  hasChanges: (newData: ProjectBlockData[]) => {
    const currentData = get().data
    return JSON.stringify(currentData) !== JSON.stringify(newData)
  },
}))
