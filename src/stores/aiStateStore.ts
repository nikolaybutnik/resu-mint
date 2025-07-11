import { create } from 'zustand'

interface AiStateStore {
  loading: boolean
  initializing: boolean
  bulletIdsGenerating: string[]

  initialize: () => Promise<void>
  setBulletIdsGenerating: (bulletIds: string[]) => void
}

export const useAiStateStore = create<AiStateStore>((set) => ({
  loading: false,
  initializing: true,
  bulletIdsGenerating: [],

  initialize: async () => {
    set({ loading: true, initializing: true })
    try {
      set({ loading: false, initializing: false, bulletIdsGenerating: [] })
    } catch (error) {
      console.error('AiStateStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  setBulletIdsGenerating: (bulletIds: string[]) => {
    set({ loading: true })
    try {
      set({ bulletIdsGenerating: bulletIds, loading: false })
    } catch (error) {
      console.error('AiStateStore: setBulletIdsGenerating error:', error)
      set({ loading: false })
    }
  },
}))
