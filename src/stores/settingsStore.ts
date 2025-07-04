import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { AppSettings } from '@/lib/types/settings'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface SettingsStore {
  data: AppSettings
  loading: boolean
  initializing: boolean
  save: (settings: AppSettings) => Promise<void>
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
}))
