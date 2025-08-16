import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { ExperienceBlockData } from '@/lib/types/experience'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { isEqual, omit } from 'lodash'
import { OperationError } from '@/lib/types/errors'

interface ExperienceStore {
  data: ExperienceBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  save: (
    data: ExperienceBlockData[]
  ) => Promise<{ error: OperationError | null }>
  refresh: () => Promise<void>
  initialize: () => Promise<void>
  hasChanges: (newData: ExperienceBlockData[]) => boolean
  hasBlockChanges: (
    blockId: string,
    newBlockData: ExperienceBlockData
  ) => boolean
  clearError: () => void
}

export const useExperienceStore = create<ExperienceStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.EXPERIENCE,
  loading: false,
  initializing: true,
  hasData: false,
  error: null,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = (await dataManager.getExperience()) as ExperienceBlockData[]
      set({
        data,
        loading: false,
        initializing: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('ExperienceStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  save: async (data: ExperienceBlockData[]) => {
    const currentState = get()

    if (!currentState.hasChanges(data)) {
      return { error: null }
    }

    const previousData = get().data
    const previousError = get().error

    // Optimistically update UI
    set({ data, hasData: !!data?.length, error: null })

    try {
      const result = await dataManager.saveExperience(data)

      if (result.success) {
        set({
          data: result.data,
          hasData: !!result.data?.length,
          error: result.warning || null,
        })
        return { error: result.warning || null }
      } else {
        set({
          data: previousData,
          hasData: !!previousData?.length,
          error: result.error,
        })
        return { error: result.error }
      }
    } catch {
      set({
        data: previousData,
        hasData: !!previousData?.length,
        error: previousError,
      })
      return { error: previousError }
    }
  },

  refresh: async () => {
    try {
      set({ loading: true })
      dataManager.invalidateExperience()
      const data = (await dataManager.getExperience()) as ExperienceBlockData[]
      set({
        data,
        loading: false,
        hasData: !!data?.length,
      })
    } catch (error) {
      console.error('ExperienceStore: refresh error:', error)
      set({ loading: false })
    }
  },

  hasChanges: (newData: ExperienceBlockData[]) => {
    const currentData = get().data

    return !isEqual(currentData, newData)
  },

  hasBlockChanges: (blockId: string, newBlockData: ExperienceBlockData) => {
    const currentData = get().data
    const existingBlock = currentData.find((block) => block.id === blockId)

    if (!existingBlock) return true

    const existingFields = omit(existingBlock, ['bulletPoints', 'isIncluded'])
    const newFields = omit(newBlockData, ['bulletPoints', 'isIncluded'])

    return !isEqual(existingFields, newFields)
  },

  clearError: () => {
    set({ error: null })
  },
}))
