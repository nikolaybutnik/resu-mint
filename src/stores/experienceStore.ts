import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { ExperienceBlockData } from '@/lib/types/experience'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { isEqual, omit, debounce } from 'lodash'
import { createValidationError, OperationError } from '@/lib/types/errors'

interface ExperienceStore {
  data: ExperienceBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  upsert: (
    block: ExperienceBlockData
  ) => Promise<{ error: OperationError | null }>
  delete: (blockId: string) => Promise<{ error: OperationError | null }>
  reorder: (
    data: ExperienceBlockData[]
  ) => Promise<{ error: OperationError | null }>
  hasChanges: (newData: ExperienceBlockData[]) => boolean
  hasBlockChanges: (
    blockId: string,
    newBlockData: ExperienceBlockData
  ) => boolean
  refresh: () => Promise<void>
  clearError: () => void
}

let debouncedSave: ReturnType<typeof debounce> | null = null
let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const useExperienceStore = create<ExperienceStore>((set, get) => {
  if (!debouncedSave) {
    debouncedSave = debounce(async (block: ExperienceBlockData) => {
      const currentState = get()

      set({ loading: true, error: null })

      const result = await dataManager.saveExperience(block)

      if (result.success) {
        set({
          data: result.data,
          loading: false,
          hasData: !!result.data?.length,
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

  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true })
        const data =
          (await dataManager.getExperience()) as ExperienceBlockData[]
        set({
          data,
          loading: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        console.error('ExperienceStore: refresh error:', error)
        set({ loading: false })
      }
    }, 300)
  }

  return {
    data: DEFAULT_STATE_VALUES.EXPERIENCE,
    loading: false,
    initializing: true,
    hasData: false,
    error: null,

    initialize: async () => {
      set({ loading: true })

      try {
        const data =
          (await dataManager.getExperience()) as ExperienceBlockData[]

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

    upsert: async (block: ExperienceBlockData) => {
      const currentState = get()

      const existingBlock = currentState.data.find(
        (item) => item.id === block.id
      )

      if (existingBlock && !currentState.hasBlockChanges(block.id, block)) {
        return { error: null }
      }

      // Optimistic UI update
      const blockIndex = currentState.data.findIndex(
        (item) => item.id === block.id
      )
      const optimisticData =
        blockIndex >= 0
          ? currentState.data.map((item) =>
              item.id === block.id ? block : item
            )
          : [...currentState.data, block]

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      debouncedSave?.(block)

      return { error: null }
    },

    delete: async (blockId: string) => {
      const currentState = get()

      const existingBlock = currentState.data.find(
        (item) => item.id === blockId
      )

      if (!existingBlock) {
        return {
          error: createValidationError('Experience block does not exist'),
        }
      }

      const optimisticData = currentState.data.filter(
        (block) => block.id !== blockId
      )

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      const result = await dataManager.deleteExperience(blockId)

      if (result.success) {
        set({
          data: result.data,
          hasData: !!result.data.length,
          error: result.warning || null,
        })
      } else {
        set({
          data: currentState.data,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
    },

    reorder: async (data: ExperienceBlockData[]) => {
      const optimisticWithPositions = data.map((block, i) => ({
        ...block,
        position: i,
      }))

      set({
        data: optimisticWithPositions,
        hasData: !!optimisticWithPositions.length,
        error: null,
      })

      const result = await dataManager.reorderExperience(
        optimisticWithPositions
      )

      if (result.success) {
        set({
          data: result.data,
          hasData: !!result.data.length,
          error: result.warning || null,
        })
      } else {
        const currentState = get()
        set({
          data: currentState.data,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
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

    refresh: async () => {
      debouncedRefresh?.()
    },

    clearError: () => {
      set({ error: null })
    },
  }
})
