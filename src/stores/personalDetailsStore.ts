import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'

interface PersonalDetailsStore {
  data: PersonalDetails
  loading: boolean
  initializing: boolean
  hasData: boolean
  save: (details: PersonalDetails) => Promise<void>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: PersonalDetails) => boolean
}

export const usePersonalDetailsStore = create<PersonalDetailsStore>(
  (set, get) => ({
    data: DEFAULT_STATE_VALUES.PERSONAL_DETAILS,
    loading: false,
    initializing: true,
    hasData: false,

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
        console.info('No changes in form, skipping save')
        return
      }

      try {
        set({ loading: true })
        await dataManager.savePersonalDetails(details)
        set({
          data: details,
          loading: false,
          hasData: !!details?.name?.trim() && !!details?.email?.trim(),
        })
      } catch (error) {
        console.error('PersonalDetailsStore: save error:', error)
        set({
          loading: false,
          data: currentState.data,
        })
      }
    },

    refresh: async () => {
      try {
        set({ loading: true })
        dataManager.invalidatePersonalDetails()
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
  })
)
