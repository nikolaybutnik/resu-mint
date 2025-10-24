import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { OperationError, createUnknownError } from '@/lib/types/errors'
import { debounce, isEqual, omit } from 'lodash'

interface PersonalDetailsStore {
  data: PersonalDetails
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  saveInFlight: boolean
  pendingSaveDetails: PersonalDetails | null
  save: (details: PersonalDetails) => Promise<{ error: OperationError | null }>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: PersonalDetails) => boolean
  clearError: () => void
}

let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const usePersonalDetailsStore = create<PersonalDetailsStore>(
  (set, get) => {
    if (!debouncedRefresh) {
      debouncedRefresh = debounce(async () => {
        try {
          const currentState = get()

          // Don't refresh if a save is in flight to avoid overwriting user changes
          if (currentState.saveInFlight) {
            return
          }

          const data = await dataManager.getPersonalDetails()
          set({
            data,
            loading: false,
            hasData: !!data?.name?.trim() && !!data?.email?.trim(),
          })
        } catch (error) {
          set({
            loading: false,
            error: createUnknownError(
              'Failed to refresh personal details',
              error
            ),
          })
        }
      }, 300)
    }

    return {
      data: DEFAULT_STATE_VALUES.PERSONAL_DETAILS,
      loading: false,
      initializing: true,
      hasData: false,
      error: null,
      saveInFlight: false,
      pendingSaveDetails: null,

      initialize: async () => {
        set({ loading: true, error: null })
        try {
          const data = await dataManager.getPersonalDetails()
          set({
            data,
            loading: false,
            initializing: false,
            hasData: !!data?.name?.trim() && !!data?.email?.trim(),
          })
        } catch (error) {
          set({
            loading: false,
            initializing: false,
            error: createUnknownError(
              'Failed to initialize personal details',
              error
            ),
          })
        }
      },

      save: async (details) => {
        const currentState = get()

        if (!currentState.hasChanges(details)) {
          return { error: null }
        }

        const previousData = currentState.data

        set({
          data: details,
          hasData: !!details?.name?.trim() && !!details?.email?.trim(),
          loading: true,
          error: null,
        })

        if (currentState.saveInFlight) {
          set({ pendingSaveDetails: details })
          return { error: null }
        }

        return executeSave(details, previousData, set, get)
      },

      refresh: async () => {
        debouncedRefresh?.()
      },

      hasChanges: (newData) => {
        const currentData = omit(get().data, ['updatedAt', 'id'])
        const incomingData = omit(newData, ['id'])
        return !isEqual(currentData, incomingData)
      },

      clearError: () => {
        set({ error: null })
      },
    }
  }
)

async function executeSave(
  details: PersonalDetails,
  previousData: PersonalDetails,
  set: (state: Partial<PersonalDetailsStore>) => void,
  get: () => PersonalDetailsStore
): Promise<{ error: OperationError | null }> {
  set({ saveInFlight: true })

  try {
    const result = await dataManager.savePersonalDetails(details)

    if (result.success) {
      set({
        data: result.data,
        hasData: !!result.data?.name?.trim() && !!result.data?.email?.trim(),
        loading: false,
        error: null,
      })

      const returnValue = { error: null }

      const currentState = get()
      if (currentState.pendingSaveDetails) {
        const nextDetails = currentState.pendingSaveDetails
        set({ pendingSaveDetails: null })
        return executeSave(nextDetails, result.data, set, get)
      }

      set({ saveInFlight: false })
      return returnValue
    } else {
      set({
        data: previousData,
        hasData: !!previousData?.name?.trim() && !!previousData?.email?.trim(),
        loading: false,
        error: result.error,
      })

      const returnValue = { error: result.error }

      const currentState = get()
      if (currentState.pendingSaveDetails) {
        const nextDetails = currentState.pendingSaveDetails
        set({ pendingSaveDetails: null })
        return executeSave(nextDetails, previousData, set, get)
      }

      set({ saveInFlight: false })
      return returnValue
    }
  } catch (error) {
    const operationError = createUnknownError(
      'Failed to save personal details',
      error
    )

    set({
      data: previousData,
      hasData: !!previousData?.name?.trim() && !!previousData?.email?.trim(),
      loading: false,
      error: operationError,
    })

    const returnValue = { error: operationError }

    const currentState = get()
    if (currentState.pendingSaveDetails) {
      const nextDetails = currentState.pendingSaveDetails
      set({ pendingSaveDetails: null })
      return executeSave(nextDetails, previousData, set, get)
    }

    set({ saveInFlight: false })
    return returnValue
  }
}
