import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { BulletPoint, ProjectBlockData } from '@/lib/types/projects'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { isEqual, omit, debounce } from 'lodash'
import {
  createValidationError,
  OperationError,
  createUnknownError,
} from '@/lib/types/errors'

interface ProjectStore {
  data: ProjectBlockData[]
  loading: boolean
  initializing: boolean
  hasData: boolean
  error: OperationError | null
  initialize: () => Promise<void>
  upsert: (block: ProjectBlockData) => Promise<{ error: OperationError | null }>
  delete: (blockId: string) => Promise<{ error: OperationError | null }>
  reorder: (
    data: ProjectBlockData[]
  ) => Promise<{ error: OperationError | null }>
  saveBullet: (
    bullet: BulletPoint,
    sectionId: string
  ) => Promise<{ error: OperationError | null }>
  deleteBullet: (
    sectionId: string,
    bulletId: string
  ) => Promise<{ error: OperationError | null }>
  toggleBulletLock: (
    sectionId: string,
    bulletId: string
  ) => Promise<{ error: OperationError | null }>
  toggleBulletLockAll: (
    sectionId: string,
    shouldLock: boolean
  ) => Promise<{ error: OperationError | null }>
  hasChanges: (newData: ProjectBlockData[]) => boolean
  hasBlockChanges: (blockId: string, newBlockData: ProjectBlockData) => boolean
  refresh: () => Promise<void>
  clearError: () => void
}

let debouncedSave: ReturnType<typeof debounce> | null = null
let debouncedRefresh: ReturnType<typeof debounce> | null = null
let lastSavedState: ProjectBlockData[] = []

export const useProjectStore = create<ProjectStore>((set, get) => {
  if (!debouncedSave) {
    debouncedSave = debounce(async (block: ProjectBlockData) => {
      set({ loading: true, error: null })

      const result = await dataManager.saveProject(block)

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
        const data = (await dataManager.getProjects()) as ProjectBlockData[]
        lastSavedState = data
        set({
          data,
          loading: false,
          hasData: !!data?.length,
        })
      } catch (error) {
        set({
          loading: false,
          error: createUnknownError('Failed to refresh project data', error),
        })
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
      set({ loading: true, error: null })

      try {
        const data = (await dataManager.getProjects()) as ProjectBlockData[]

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
          error: createUnknownError('Failed to initialize project data', error),
        })
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

    delete: async (blockId: string) => {
      const currentState = get()

      const existingBlock = currentState.data.find(
        (item) => item.id === blockId
      )

      if (!existingBlock) {
        return {
          error: createValidationError('Project block does not exist'),
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

      const result = await dataManager.deleteProject(blockId)

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

    reorder: async (data: ProjectBlockData[]) => {
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

      const result = await dataManager.reorderProjects(optimisticWithPositions)

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

    saveBullet: async (bullet: BulletPoint, sectionId: string) => {
      const currentState = get()
      const previousData = currentState.data

      const optimisticData = currentState.data.map((block) =>
        block.id === sectionId
          ? {
              ...block,
              bulletPoints: block.bulletPoints?.some((b) => b.id === bullet.id)
                ? block.bulletPoints.map((b) =>
                    b.id === bullet.id ? bullet : b
                  )
                : [...(block.bulletPoints || []), bullet],
            }
          : block
      )

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      const result = await dataManager.saveProjectBullet(bullet, sectionId)

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
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
    },

    deleteBullet: async (sectionId: string, bulletId: string) => {
      const currentState = get()
      const previousData = currentState.data

      const optimisticData = currentState.data.map((block) =>
        block.id === sectionId
          ? {
              ...block,
              bulletPoints: block.bulletPoints?.filter(
                (b) => b.id !== bulletId
              ),
            }
          : block
      )

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      const result = await dataManager.deleteProjectBullet(sectionId, bulletId)

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
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
    },

    toggleBulletLock: async (sectionId: string, bulletId: string) => {
      const currentState = get()
      const previousData = currentState.data

      const optimisticData = currentState.data.map((block) =>
        block.id === sectionId
          ? {
              ...block,
              bulletPoints: block.bulletPoints?.map((b) =>
                b.id === bulletId ? { ...b, isLocked: !b.isLocked } : b
              ),
            }
          : block
      )

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      const result = await dataManager.toggleProjectBulletLock(
        sectionId,
        bulletId
      )

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
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
    },

    toggleBulletLockAll: async (sectionId: string, shouldLock: boolean) => {
      const currentState = get()
      const previousData = currentState.data

      const optimisticData = currentState.data.map((block) =>
        block.id === sectionId
          ? {
              ...block,
              bulletPoints: block.bulletPoints?.map((b) => ({
                ...b,
                isLocked: shouldLock,
              })),
            }
          : block
      )

      set({
        data: optimisticData,
        hasData: !!optimisticData.length,
        error: null,
      })

      const result = await dataManager.toggleProjectBulletLockAll(
        sectionId,
        shouldLock
      )

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
          data: previousData,
          hasData: !!previousData.length,
          error: result.error,
        })
      }

      return { error: result.success ? null : result.error }
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
