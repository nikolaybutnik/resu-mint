import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { ExperienceBlockData } from '@/lib/types/experience'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { isEqual, omit } from 'lodash'
import { createUnknownError, OperationError } from '@/lib/types/errors'
import { experienceManager } from '@/lib/data'

interface ExperienceStore {
  data: ExperienceBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  save: (
    data: ExperienceBlockData[]
  ) => Promise<{ error: OperationError | null }>
  upsert: (
    block: ExperienceBlockData
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

  // TODO: phase out save as granular operations are being implemented.
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

  upsert: async (block: ExperienceBlockData) => {
    const currentState = get()

    const existingBlock = currentState.data.find((item) => item.id === block.id)

    if (existingBlock && !currentState.hasBlockChanges(block.id, block)) {
      return { error: null }
    }

    const previousData = currentState.data
    const previousError = currentState.error

    // Optimistic UI update
    const blockIndex = previousData.findIndex((item) => item.id === block.id)
    const optimisticData =
      blockIndex >= 0
        ? previousData.map((item) => (item.id === block.id ? block : item))
        : [...previousData, block]

    set({ data: optimisticData, hasData: !!optimisticData.length, error: null })

    try {
      const result = await experienceManager.upsert(block)

      if (result.success) {
        set({
          data: result.data,
          hasData: !!result.data.length,
          error: result.warning || null,
        })
        return { error: result.warning || null }
      } else {
        set({
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
        return { error: result.error }
      }
    } catch (error) {
      set({
        data: previousData,
        hasData: !!previousData.length,
        error: previousError,
      })
      return { error: createUnknownError('Failed to upsert experience', error) }
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

    const existingFields = omit(existingBlock, [
      'bulletPoints',
      'updatedAt',
      'isIncluded',
      'position',
    ])
    const newFields = omit(newBlockData, [
      'bulletPoints',
      'updatedAt',
      'isIncluded',
      'position',
    ])

    return !isEqual(existingFields, newFields)
  },

  clearError: () => {
    set({ error: null })
  },
}))
