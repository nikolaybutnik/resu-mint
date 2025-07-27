import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { AppSettings, ResumeSection } from '@/lib/types/settings'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface SettingsStore {
  data: AppSettings
  loading: boolean
  initializing: boolean
  save: (settings: AppSettings) => Promise<void>
  saveOrder: (order: ResumeSection[]) => Promise<void>
  initialize: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.SETTINGS,
  loading: false,
  initializing: true,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = await dataManager.getSettings()
      set({
        data,
        loading: false,
        initializing: false,
      })
    } catch (error) {
      console.error('SettingsStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  save: async (settings: AppSettings) => {
    try {
      set({ loading: true })
      await dataManager.saveSettings(settings)
      set({
        data: settings,
        loading: false,
      })
    } catch (error) {
      console.error('SettingsStore: save error:', error)
      const currentState = get()
      set({
        loading: false,
        data: currentState.data,
      })
    }
  },

  saveOrder: async (order: ResumeSection[]) => {
    const previousData = get().data

    set({
      data: {
        ...previousData,
        sectionOrder: order,
      },
    })

    try {
      await dataManager.saveSettings({
        ...previousData,
        sectionOrder: order,
      })
    } catch (error) {
      set({ data: previousData })
      console.error('SettingsStore: save error:', error)
      throw error
    }
  },
}))
