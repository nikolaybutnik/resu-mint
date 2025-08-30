import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { OperationError } from '@/lib/types/errors'

interface PersonalDetailsStore {
  data: PersonalDetails
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  save: (details: PersonalDetails) => Promise<{ error: OperationError | null }>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: PersonalDetails) => boolean
  clearError: () => void
}

export const usePersonalDetailsStore = create<PersonalDetailsStore>(
  (set, get) => ({
    data: DEFAULT_STATE_VALUES.PERSONAL_DETAILS,
    loading: false,
    initializing: true,
    hasData: false,
    error: null,

    initialize: async () => {
      set({ loading: true })
      try {
        const data = await dataManager.getPersonalDetails()
        set({
          data,
          loading: false,
          initializing: false,
          hasData: !!data?.name?.trim() && !!data?.email?.trim(),
        })
      } catch (error) {
        console.error('PersonalDetailsStore: initialization error:', error)
        set({ loading: false, initializing: false })
      }
    },

    save: async (details) => {
      const currentState = get()

      if (!currentState.hasChanges(details)) {
        return { error: null }
      }

      set({ loading: true, error: null })

      const result = await dataManager.savePersonalDetails(details)

      if (result.success) {
        set({
          data: result.data,
          loading: false,
          hasData: !!result.data?.name?.trim() && !!result.data?.email?.trim(),
          error: result.warning || null,
        })
        return { error: result.warning || null }
      } else {
        set({
          loading: false,
          data: currentState.data,
          error: result.error,
        })
        return { error: result.error }
      }
    },

    refresh: async () => {
      try {
        set({ loading: true })
        const data = await dataManager.getPersonalDetails()
        set({
          data,
          loading: false,
          hasData: !!data?.name?.trim() && !!data?.email?.trim(),
        })
      } catch (error) {
        console.error('PersonalDetailsStore: refresh error:', error)
        set({ loading: false })
      }
    },

    hasChanges: (newData) => {
      const currentData = get().data
      return JSON.stringify(currentData) !== JSON.stringify(newData)
    },

    clearError: () => {
      set({ error: null })
    },
  })
)
