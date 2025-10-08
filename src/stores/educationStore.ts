import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { EducationBlockData } from '@/lib/types/education'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import {
  createUnknownError,
  createValidationError,
  OperationError,
} from '@/lib/types/errors'
import { debounce, isEqual, omit } from 'lodash'

interface EducationStore {
  data: EducationBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  upsert: (
    block: EducationBlockData
  ) => Promise<{ error: OperationError | null }>
  delete: (blockId: string) => Promise<{ error: OperationError | null }>
  reorder: (
    data: EducationBlockData[]
  ) => Promise<{ error: OperationError | null }>
  hasChanges: (newData: EducationBlockData[]) => boolean
  hasBlockChanges: (
    blockId: string,
    newBlockData: EducationBlockData
  ) => boolean
  refresh: () => Promise<void>
  clearError: () => void
}

let debouncedSave: ReturnType<typeof debounce> | null = null
let debouncedRefresh: ReturnType<typeof debounce> | null = null
let lastSavedState: EducationBlockData[] = []

export const useEducationStore = create<EducationStore>((set, get) => {
  if (!debouncedSave) {
    debouncedSave = debounce(async (block: EducationBlockData) => {
      set({ loading: true, error: null })

      const result = await dataManager.saveEducation(block)

      if (result.success) {
        lastSavedState = result.data
        set({
          data: result.data,
          loading: false,
          hasData: !!result.data?.length,
          error: result.warning || null,
        })
      } else {
        set({
          loading: false,
          data: lastSavedState,
          hasData: !!lastSavedState.length,
          error: result.error,
        })
      }
    }, 1000)
  }

  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true, error: null })
        const data = (await dataManager.getEducation()) as EducationBlockData[]
        lastSavedState = data
        set({
          data,
          loading: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        set({
          loading: false,
          error: createUnknownError('Failed to refresh education data', error),
        })
      }
    }, 300)
  }

  return {
    data: DEFAULT_STATE_VALUES.EDUCATION,
    loading: false,
    initializing: true,
    hasData: false,
    error: null,

    initialize: async () => {
      set({ loading: true, error: null })

      try {
        const data = (await dataManager.getEducation()) as EducationBlockData[]

        lastSavedState = data
        set({
          data,
          loading: false,
          initializing: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        set({
          loading: false,
          initializing: false,
          error: createUnknownError(
            'Failed to initialize education data',
            error
          ),
        })
      }
    },

    upsert: async (block: EducationBlockData) => {
      const currentState = get()

      const existingBlock = currentState.data.find(
        (item) => item.id === block.id
      )

      const hasContentChanges =
        existingBlock && currentState.hasBlockChanges(block.id, block)
      const hasInclusionChange =
        existingBlock && existingBlock.isIncluded !== block.isIncluded

      if (existingBlock && !hasContentChanges && !hasInclusionChange) {
        return { error: null }
      }

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
          error: createValidationError('Education block does not exist'),
        }
      }

      const previousData = currentState.data
      const optimisticData = currentState.data.filter(
        (block) => block.id !== blockId
      )

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      const result = await dataManager.deleteEducation(blockId)

      if (result.success) {
        lastSavedState = result.data
        set({
          data: result.data,
          hasData: !!result.data.length,
          error: result.warning || null,
        })
      } else {
        set({
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
    },

    reorder: async (data: EducationBlockData[]) => {
      const previousData = get().data
      const optimisticWithPositions = data.map((block, i) => ({
        ...block,
        position: i,
      }))

      set({
        data: optimisticWithPositions,
        hasData: !!optimisticWithPositions.length,
        error: null,
      })

      const result = await dataManager.reorderEducation(optimisticWithPositions)

      if (result.success) {
        lastSavedState = result.data
        set({
          data: result.data,
          hasData: !!result.data.length,
          error: result.warning || null,
        })
      } else {
        set({
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
    },

    hasChanges: (newData: EducationBlockData[]) => {
      const currentData = get().data

      return !isEqual(currentData, newData)
    },

    hasBlockChanges: (blockId: string, newBlockData: EducationBlockData) => {
      const currentData = get().data
      const existingBlock = currentData.find((block) => block.id === blockId)

      if (!existingBlock && !currentData) return false

      const existingFields = omit(existingBlock, [
        'updatedAt',
        'position',
        'isIncluded',
      ])
      const newFields = omit(newBlockData, [
        'updatedAt',
        'position',
        'isIncluded',
      ])

      if (
        (!existingFields || Object.keys(existingFields).length === 0) &&
        !newFields.institution &&
        !newFields.degree &&
        !newFields.degreeStatus &&
        !newFields.location &&
        !newFields.description &&
        !newFields.startDate?.month &&
        !newFields.startDate?.year &&
        !newFields.endDate?.month &&
        !newFields.endDate?.year
      )
        return false

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
