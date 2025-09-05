import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { OperationError } from '@/lib/types/errors'
import { debounce, isEqual, omit } from 'lodash'

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
  cleanup: () => void
}

let debouncedSave: ReturnType<typeof debounce> | null = null

export const usePersonalDetailsStore = create<PersonalDetailsStore>(
  (set, get) => {
    if (!debouncedSave) {
      debouncedSave = debounce(async (details: PersonalDetails) => {
        const currentState = get()

        set({ loading: true, error: null })

        const result = await dataManager.savePersonalDetails(details)

        if (result.success) {
          set({
            data: result.data,
            loading: false,
            hasData:
              !!result.data?.name?.trim() && !!result.data?.email?.trim(),
            error: result.warning || null,
          })
        } else {
          set({
            loading: false,
            data: currentState.data,
            error: result.error,
          })
        }
      }, 1000)
    }

    return {
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

        // Optimistic UI update
        set({
          data: details,
          hasData: !!details?.name?.trim() && !!details?.email?.trim(),
          error: null,
        })

        debouncedSave?.(details)

        return { error: null }
      },

      // TODO: this happens when i log out and log into another account.
      // This happens because dozens of electric messages come in from the server, and overload the app.
      // This also cause the flive preview service to get hammered:
      // (57 calls) livePreviewService.ts:391 Using in-memory cached PDF
      /*
      personalDetailsStore.ts:104 PersonalDetailsStore: refresh error: Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
      at refresh (personalDetailsStore.ts:96:11)
      at eval (dbStore.ts:294:38)
      refresh	@	personalDetailsStore.ts:104
      eval	@	dbStore.ts:294
      */

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
        const currentData = omit(get().data, ['updatedAt'])
        return !isEqual(currentData, newData)
      },

      clearError: () => {
        set({ error: null })
      },

      cleanup: () => {
        if (debouncedSave?.cancel) {
          debouncedSave.cancel()
        }
      },
    }
  }
)
