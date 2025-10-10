import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { AppSettings, ResumeSection } from '@/lib/types/settings'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { createUnknownError, OperationError } from '@/lib/types/errors'
import { debounce } from 'lodash'

interface SettingsStore {
  data: AppSettings
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  saveInFlight: boolean
  pendingSaveSettings: AppSettings | null
  initialize: () => Promise<void>
  save: (settings: AppSettings) => Promise<{ error: OperationError | null }>
  saveOrder: (
    order: ResumeSection[]
  ) => Promise<{ error: OperationError | null }>
  refresh: () => Promise<void>
  clearError: () => void
  cleanup: () => void
}

let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const useSettingsStore = create<SettingsStore>((set, get) => {
  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        const currentState = get()

        // Don't refresh if a save is in flight to avoid overwriting user changes
        if (currentState.saveInFlight) {
          return
        }

        const data = await dataManager.getSettings()
        set({
          data,
          loading: false,
          hasData:
            !!data?.bulletsPerExperienceBlock &&
            !!data?.bulletsPerProjectBlock &&
            !!data?.maxCharsPerBullet &&
            !!data?.languageModel &&
            !!data?.sectionOrder.length,
          error: null,
        })
      } catch (error) {
        set({
          loading: false,
          error: createUnknownError('Failed to refresh settings', error),
        })
      }
    }, 300)
  }

  return {
    data: DEFAULT_STATE_VALUES.SETTINGS,
    loading: false,
    initializing: true,
    hasData: false,
    error: null,
    saveInFlight: false,
    pendingSaveSettings: null,

    initialize: async () => {
      set({ loading: true, error: null })
      try {
        const data = await dataManager.getSettings()

        const settingsData = data || DEFAULT_STATE_VALUES.SETTINGS

        set({
          data: settingsData,
          loading: false,
          initializing: false,
          hasData:
            !!settingsData?.bulletsPerExperienceBlock &&
            !!settingsData?.bulletsPerProjectBlock &&
            !!settingsData?.maxCharsPerBullet &&
            !!settingsData?.languageModel &&
            !!settingsData?.sectionOrder?.length,
          error: null,
        })
      } catch (error) {
        set({
          loading: false,
          initializing: false,
          error: createUnknownError('Failed to initialize settings', error),
        })
      }
    },

    save: async (settings) => {
      const currentState = get()
      const previousData = currentState.data

      set({
        data: settings,
        hasData:
          !!settings?.bulletsPerExperienceBlock &&
          !!settings?.bulletsPerProjectBlock &&
          !!settings?.maxCharsPerBullet &&
          !!settings?.languageModel &&
          !!settings?.sectionOrder.length,
        loading: true,
        error: null,
      })

      if (currentState.saveInFlight) {
        set({ pendingSaveSettings: settings })
        return { error: null }
      }

      return executeSave(settings, previousData, set, get)
    },

    saveOrder: async (order: ResumeSection[]) => {
      const previousData = get().data

      if (!previousData.id) {
        return {
          error: createUnknownError('Settings not initialized - no ID found'),
        }
      }

      set({
        data: { ...previousData, sectionOrder: order },
        loading: true,
        error: null,
      })

      try {
        const result = await dataManager.saveSectionOrder(
          previousData.id,
          order
        )
        if (result.success) {
          set({
            data: result.data,
            loading: false,
            error: result.warning || null,
          })
          return { error: null }
        } else {
          set({
            data: previousData,
            loading: false,
            error: result.error,
          })
          return { error: result.error }
        }
      } catch (error) {
        const operationError = createUnknownError(
          'Failed to save section order',
          error
        )

        set({
          data: previousData,
          loading: false,
          error: operationError,
        })

        return { error: operationError }
      }
    },

    refresh: async () => {
      debouncedRefresh?.()
    },

    clearError: () => {
      set({ error: null })
    },

    cleanup: () => {
      set({ saveInFlight: false, pendingSaveSettings: null })
    },
  }
})

async function executeSave(
  settings: AppSettings,
  previousData: AppSettings,
  set: (state: Partial<SettingsStore>) => void,
  get: () => SettingsStore
): Promise<{ error: OperationError | null }> {
  set({ saveInFlight: true })

  try {
    const result = await dataManager.saveSettings(settings)

    if (result.success) {
      set({
        data: result.data,
        hasData:
          !!result.data?.bulletsPerExperienceBlock &&
          !!result.data?.bulletsPerProjectBlock &&
          !!result.data?.maxCharsPerBullet &&
          !!result.data?.languageModel &&
          !!result.data?.sectionOrder.length,
        loading: false,
        error: result.warning || null,
      })

      const returnValue = { error: result.warning || null }

      const currentState = get()
      if (currentState.pendingSaveSettings) {
        const nextSettings = currentState.pendingSaveSettings
        set({ pendingSaveSettings: null })
        return executeSave(nextSettings, result.data, set, get)
      }

      set({ saveInFlight: false })
      return returnValue
    } else {
      set({
        data: previousData,
        hasData:
          !!previousData?.bulletsPerExperienceBlock &&
          !!previousData?.bulletsPerProjectBlock &&
          !!previousData?.maxCharsPerBullet &&
          !!previousData?.languageModel &&
          !!previousData?.sectionOrder.length,
        loading: false,
        error: result.error,
      })

      const returnValue = { error: result.error }

      const currentState = get()
      if (currentState.pendingSaveSettings) {
        const nextSettings = currentState.pendingSaveSettings
        set({ pendingSaveSettings: null })
        return executeSave(nextSettings, previousData, set, get)
      }

      set({ saveInFlight: false })
      return returnValue
    }
  } catch (error) {
    const operationError = createUnknownError('Failed to save settings', error)

    set({
      data: previousData,
      hasData:
        !!previousData?.bulletsPerExperienceBlock &&
        !!previousData?.bulletsPerProjectBlock &&
        !!previousData?.maxCharsPerBullet &&
        !!previousData?.languageModel &&
        !!previousData?.sectionOrder.length,
      loading: false,
      error: operationError,
    })

    const returnValue = { error: operationError }

    const currentState = get()
    if (currentState.pendingSaveSettings) {
      const nextSettings = currentState.pendingSaveSettings
      set({ pendingSaveSettings: null })
      return executeSave(nextSettings, previousData, set, get)
    }

    set({ saveInFlight: false })
    return returnValue
  }
}
