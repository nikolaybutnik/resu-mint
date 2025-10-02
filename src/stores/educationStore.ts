import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { EducationBlockData } from '@/lib/types/education'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { createUnknownError, OperationError } from '@/lib/types/errors'
import { debounce, isEqual, omit } from 'lodash'

interface EducationStore {
  data: EducationBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  // upsert: (
  //   block: EducationBlockData
  // ) => Promise<{ error: OperationError | null }>
  // delete: (blockId: string) => Promise<{ error: OperationError | null }>
  // reorder: (
  //   data: EducationBlockData[]
  // ) => Promise<{ error: OperationError | null }>
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

export const useEducationStore = create<EducationStore>((set, get) => {
  if (!debouncedSave) {
    debouncedSave = debounce(async (block: EducationBlockData) => {
      const currentState = get()

      set({ loading: true, error: null })

      // const result = await dataManager.saveEducation(block)

      // if (result.success) {
      //   set({
      //     data: result.data,
      //     loading: false,
      //     hasData: !!result.data?.length,
      //     error: result.warning || null,
      //   })
      // } else {
      //   set({
      //     loading: false,
      //     data: currentState.data,
      //     error: result.error,
      //   })
      // }
    }, 1000)
  }

  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true, error: null })
        const data = (await dataManager.getEducation()) as EducationBlockData[]
        set({
          data,
          loading: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        console.error('EducationStore: refresh error:', error)
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

        set({
          data,
          loading: false,
          initializing: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        console.error('EducationStore: initialization error:', error)

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
