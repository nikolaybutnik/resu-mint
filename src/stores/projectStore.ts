import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { ProjectBlockData } from '@/lib/types/projects'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { isEqual, omit, debounce } from 'lodash'
import { OperationError } from '@/lib/types/errors'

interface ProjectStore {
  data: ProjectBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  upsert: (block: ProjectBlockData) => Promise<{ error: OperationError | null }>
  // delete: (blockId: string) => Promise<{ error: OperationError | null }>
  // reorder: (
  //   data: ProjectBlockData[]
  // ) => Promise<{ error: OperationError | null }>
  // saveBullet: (
  //   bullet: BulletPoint,
  //   sectionId: string
  // ) => Promise<{ error: OperationError | null }>
  // deleteBullet: (
  //   sectionId: string,
  //   bulletId: string
  // ) => Promise<{ error: OperationError | null }>
  // toggleBulletLock: (
  //   sectionId: string,
  //   bulletId: string
  // ) => Promise<{ error: OperationError | null }>
  // toggleBulletLockAll: (
  //   sectionId: string,
  //   shouldLock: boolean
  // ) => Promise<{ error: OperationError | null }>
  hasChanges: (newData: ProjectBlockData[]) => boolean
  hasBlockChanges: (blockId: string, newBlockData: ProjectBlockData) => boolean
  refresh: () => Promise<void>
  clearError: () => void
}

let debouncedSave: ReturnType<typeof debounce> | null = null
let debouncedRefresh: ReturnType<typeof debounce> | null = null

export const useProjectStore = create<ProjectStore>((set, get) => {
  if (!debouncedSave) {
    debouncedSave = debounce(async (block: ProjectBlockData) => {
      const currentState = get()

      set({ loading: true, error: null })

      const result = await dataManager.saveProject(block)

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
        const data = (await dataManager.getProjects()) as ProjectBlockData[]
        set({
          data,
          loading: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        console.error('ProjectsStore: refresh error:', error)
        set({ loading: false })
      }
    }, 300)
  }

  return {
    data: DEFAULT_STATE_VALUES.PROJECTS,
    loading: false,
    initializing: true,
    hasData: false,
    error: null,

    initialize: async () => {
      set({ loading: true })

      try {
        const data = (await dataManager.getProjects()) as ProjectBlockData[]

        set({
          data,
          loading: false,
          initializing: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        console.error('ProjectsStore: initialization error:', error)

        set({ loading: false, initializing: false })
      }
    },

    upsert: async (block: ProjectBlockData) => {
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

    hasChanges: (newData: ProjectBlockData[]) => {
      const currentData = get().data

      return !isEqual(currentData, newData)
    },

    hasBlockChanges: (blockId: string, newBlockData: ProjectBlockData) => {
      const currentData = get().data
      const existingBlock = currentData.find((block) => block.id === blockId)

      if (!existingBlock && !currentData) return false

      const existingFields = omit(existingBlock, [
        'bulletPoints',
        'updatedAt',
        'position',
        'isIncluded',
      ])
      const newFields = omit(newBlockData, [
        'bulletPoints',
        'updatedAt',
        'position',
        'isIncluded',
      ])

      if (
        (!existingFields || Object.keys(existingFields).length === 0) &&
        !newFields.title &&
        !newFields.link &&
        !newFields.description &&
        !newFields.technologies.length &&
        !newFields.startDate.month &&
        !newFields.startDate.year &&
        !newFields.endDate.month &&
        !newFields.endDate.year &&
        !newFields.endDate.isPresent
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
