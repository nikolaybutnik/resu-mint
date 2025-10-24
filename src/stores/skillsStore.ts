import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'
import { Skills } from '@/lib/types/skills'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { SkillBlock } from '@/lib/types/skills'
import { createUnknownError, OperationError } from '@/lib/types/errors'
import { debounce, isEqual, omit } from 'lodash'

interface SkillsStore {
  skillsData: Skills
  resumeSkillsData: SkillBlock[]
  loading: boolean
  initializing: boolean
  hasSkillsData: boolean
  hasResumeSkillData: boolean
  error: OperationError | null
  savesInFlight: Set<string>
  pendingSaveResumeSkills: Map<string, SkillBlock>
  initialize: () => Promise<void>
  upsertSkills: (skills: Skills) => Promise<{ error: OperationError | null }>
  upsertResumeSkillBlock: (
    block: SkillBlock
  ) => Promise<{ error: OperationError | null }>
  deleteResumeSkillBlock: (
    blockId: string
  ) => Promise<{ error: OperationError | null }>
  reorderResumeSkills: (
    blocks: SkillBlock[]
  ) => Promise<{ error: OperationError | null }>
  refresh: () => Promise<void>
  skillsHaveChanges: (newData: Skills) => boolean
  resumeSkillBlockHasChanges: (
    blockId: string,
    newBlockData: SkillBlock
  ) => boolean
  clearError: () => void
}

let debouncedSkillsSave: ReturnType<typeof debounce> | null = null
let lastSavedSkillsState: Skills = DEFAULT_STATE_VALUES.SKILLS
let debouncedRefresh: ReturnType<typeof debounce> | null = null

// Per-block debounce timers for resume skills
const blockDebounceTimers = new Map<string, NodeJS.Timeout>()

export const useSkillsStore = create<SkillsStore>((set, get) => {
  if (!debouncedSkillsSave) {
    debouncedSkillsSave = debounce(async (skills: Skills) => {
      set({ loading: true, error: null })

      const result = await dataManager.saveSkills(skills)

      if (result.success) {
        lastSavedSkillsState = result.data
        set({
          skillsData: result.data,
          loading: false,
          hasSkillsData:
            !!result.data?.hardSkills?.skills?.length ||
            !!result.data?.softSkills?.skills?.length,
          error: null,
        })
      } else {
        set({
          loading: false,
          skillsData: lastSavedSkillsState,
          hasSkillsData:
            !!lastSavedSkillsState?.hardSkills?.skills?.length ||
            !!lastSavedSkillsState?.softSkills?.skills?.length,
          error: result.error,
        })
      }
    }, 1000)
  }

  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        const currentState = get()

        // Don't refresh if:
        // 1. Any saves are in flight
        // 2. Any saves are pending (queued)
        // 3. Any debounce timers are active (user made changes but save hasn't started)
        if (
          currentState.savesInFlight.size > 0 ||
          currentState.pendingSaveResumeSkills.size > 0 ||
          blockDebounceTimers.size > 0
        ) {
          return
        }

        set({ loading: true, error: null })
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        lastSavedSkillsState = skillsData

        set({
          skillsData,
          resumeSkillsData,
          loading: false,
          hasSkillsData:
            !!skillsData?.hardSkills?.skills?.length ||
            !!skillsData?.softSkills?.skills?.length,
          hasResumeSkillData: !!resumeSkillsData?.length,
        })
      } catch (error) {
        set({
          loading: false,
          error: createUnknownError('Failed to refresh skills data', error),
        })
      }
    }, 300)
  }

  return {
    skillsData: DEFAULT_STATE_VALUES.SKILLS,
    resumeSkillsData: DEFAULT_STATE_VALUES.RESUME_SKILLS,
    loading: false,
    initializing: true,
    hasSkillsData: false,
    hasResumeSkillData: false,
    error: null,
    savesInFlight: new Set<string>(),
    pendingSaveResumeSkills: new Map<string, SkillBlock>(),

    initialize: async () => {
      set({ loading: true, error: null })
      try {
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        lastSavedSkillsState = skillsData

        set({
          skillsData,
          resumeSkillsData,
          loading: false,
          initializing: false,
          hasSkillsData:
            !!skillsData?.hardSkills?.skills?.length ||
            !!skillsData?.softSkills?.skills?.length,
          hasResumeSkillData: !!resumeSkillsData?.length,
        })
      } catch (error) {
        set({
          loading: false,
          initializing: false,
          error: createUnknownError('Failed to initialize skills data', error),
        })
      }
    },

    upsertSkills: async (skillsData: Skills) => {
      const currentState = get()

      if (!currentState.skillsHaveChanges(skillsData)) {
        return { error: null }
      }

      set({
        skillsData,
        hasSkillsData:
          !!skillsData?.hardSkills?.skills?.length ||
          !!skillsData?.softSkills?.skills?.length,
        error: null,
      })

      debouncedSkillsSave?.(skillsData)

      return { error: null }
    },

    upsertResumeSkillBlock: async (block: SkillBlock) => {
      const currentState = get()

      const existingBlock = currentState.resumeSkillsData.find(
        (item) => item.id === block.id
      )

      if (
        existingBlock &&
        !currentState.resumeSkillBlockHasChanges(block.id, block)
      ) {
        return { error: null }
      }

      const blockIndex = currentState.resumeSkillsData.findIndex(
        (item) => item.id === block.id
      )
      const optimisticData =
        blockIndex >= 0
          ? currentState.resumeSkillsData.map((item) =>
              item.id === block.id ? block : item
            )
          : [...currentState.resumeSkillsData, block]

      set({
        resumeSkillsData: optimisticData,
        hasResumeSkillData: !!optimisticData.length,
        error: null,
      })

      // Clear existing debounce timer for this block
      const existingTimer = blockDebounceTimers.get(block.id)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // If this block is already being saved, queue the new version
      if (currentState.savesInFlight.has(block.id)) {
        const newPending = new Map(currentState.pendingSaveResumeSkills)
        newPending.set(block.id, block)
        set({ pendingSaveResumeSkills: newPending })
        return { error: null }
      }

      // Debounce the save for 1 second
      const timer = setTimeout(() => {
        blockDebounceTimers.delete(block.id)

        // Get the latest state to ensure we have the most up-to-date data
        const latestState = get()
        const latestBlock = latestState.resumeSkillsData.find(
          (b) => b.id === block.id
        )

        if (latestBlock) {
          executeResumeSkillSave(
            latestBlock,
            latestState.resumeSkillsData,
            set,
            get
          )
        }
      }, 1000)

      blockDebounceTimers.set(block.id, timer)

      return { error: null }
    },

    deleteResumeSkillBlock: async (blockId: string) => {
      const currentState = get()
      const previousData = currentState.resumeSkillsData

      // Clear any pending debounced save for this block
      const existingTimer = blockDebounceTimers.get(blockId)
      if (existingTimer) {
        clearTimeout(existingTimer)
        blockDebounceTimers.delete(blockId)
      }

      // Remove from pending saves
      const newPending = new Map(currentState.pendingSaveResumeSkills)
      newPending.delete(blockId)

      const optimisticData = currentState.resumeSkillsData.filter(
        (block) => block.id !== blockId
      )

      const newInFlight = new Set(currentState.savesInFlight)
      newInFlight.add(blockId)

      set({
        resumeSkillsData: optimisticData,
        hasResumeSkillData: !!optimisticData.length,
        loading: true,
        error: null,
        savesInFlight: newInFlight,
        pendingSaveResumeSkills: newPending,
      })

      const result = await dataManager.deleteResumeSkillBlock(blockId)

      const currentStateAfterDelete = get()
      const updatedInFlight = new Set(currentStateAfterDelete.savesInFlight)
      updatedInFlight.delete(blockId)

      if (result.success) {
        // Merge strategy: preserve optimistic updates for blocks with saves in flight or pending
        const mergedData = result.data.map((serverBlock) => {
          if (
            updatedInFlight.has(serverBlock.id) ||
            currentStateAfterDelete.pendingSaveResumeSkills.has(
              serverBlock.id
            ) ||
            blockDebounceTimers.has(serverBlock.id)
          ) {
            const currentBlock = currentStateAfterDelete.resumeSkillsData.find(
              (b) => b.id === serverBlock.id
            )
            return currentBlock || serverBlock
          }
          return serverBlock
        })

        set({
          resumeSkillsData: mergedData,
          hasResumeSkillData: !!mergedData.length,
          loading: false,
          error: null,
          savesInFlight: updatedInFlight,
        })
      } else {
        set({
          resumeSkillsData: previousData,
          hasResumeSkillData: !!previousData.length,
          loading: false,
          error: result.error,
          savesInFlight: updatedInFlight,
        })
      }

      return { error: result.success ? null : result.error }
    },

    reorderResumeSkills: async (data: SkillBlock[]) => {
      const currentState = get()
      const previousData = currentState.resumeSkillsData
      const optimisticWithPositions = data.map((block, i) => ({
        ...block,
        position: i,
      }))

      // Use a special 'reorder' key for the reorder operation
      const newInFlight = new Set(currentState.savesInFlight)
      newInFlight.add('reorder')

      set({
        resumeSkillsData: optimisticWithPositions,
        hasResumeSkillData: !!optimisticWithPositions.length,
        loading: true,
        error: null,
        savesInFlight: newInFlight,
      })

      const result = await dataManager.reorderResumeSkills(
        optimisticWithPositions
      )

      const currentStateAfterReorder = get()
      const updatedInFlight = new Set(currentStateAfterReorder.savesInFlight)
      updatedInFlight.delete('reorder')

      if (result.success) {
        // Merge strategy: preserve optimistic updates for blocks with saves in flight or pending
        const mergedData = result.data.map((serverBlock) => {
          if (
            updatedInFlight.has(serverBlock.id) ||
            currentStateAfterReorder.pendingSaveResumeSkills.has(
              serverBlock.id
            ) ||
            blockDebounceTimers.has(serverBlock.id)
          ) {
            const currentBlock = currentStateAfterReorder.resumeSkillsData.find(
              (b) => b.id === serverBlock.id
            )
            return currentBlock || serverBlock
          }
          return serverBlock
        })

        set({
          resumeSkillsData: mergedData,
          hasResumeSkillData: !!mergedData.length,
          loading: false,
          error: null,
          savesInFlight: updatedInFlight,
        })
      } else {
        set({
          resumeSkillsData: previousData,
          hasResumeSkillData: !!previousData.length,
          loading: false,
          error: result.error,
          savesInFlight: updatedInFlight,
        })
      }

      return { error: result.success ? null : result.error }
    },

    skillsHaveChanges: (newData: Skills) => {
      const currentData = omit(get().skillsData, ['id', 'updatedAt'])
      const incomingData = omit(newData, ['id', 'updatedAt'])
      return !isEqual(currentData, incomingData)
    },

    resumeSkillBlockHasChanges: (blockId: string, newBlockData: SkillBlock) => {
      const currentData = get().resumeSkillsData
      const existingBlock = currentData.find((block) => block.id === blockId)

      if (!existingBlock) return true

      const existingFields = omit(existingBlock, ['updatedAt', 'position'])
      const newFields = omit(newBlockData, ['updatedAt', 'position'])

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

async function executeResumeSkillSave(
  block: SkillBlock,
  previousData: SkillBlock[],
  set: (state: Partial<SkillsStore>) => void,
  get: () => SkillsStore
): Promise<{ error: OperationError | null }> {
  const currentState = get()
  const newInFlight = new Set(currentState.savesInFlight)
  newInFlight.add(block.id)
  set({ savesInFlight: newInFlight })

  try {
    const result = await dataManager.saveResumeSkillBlock(block)

    const updatedInFlight = new Set(get().savesInFlight)
    updatedInFlight.delete(block.id)

    if (result.success) {
      // Merge strategy: preserve optimistic updates for blocks with saves in flight or pending
      const currentState = get()
      const mergedData = result.data.map((serverBlock) => {
        // Keep optimistic state if:
        // 1. This block has a save currently in flight, OR
        // 2. This block has a pending save queued up, OR
        // 3. This block has a debounce timer running (user made changes but save hasn't started)
        if (
          updatedInFlight.has(serverBlock.id) ||
          currentState.pendingSaveResumeSkills.has(serverBlock.id) ||
          blockDebounceTimers.has(serverBlock.id)
        ) {
          const currentBlock = currentState.resumeSkillsData.find(
            (b) => b.id === serverBlock.id
          )
          return currentBlock || serverBlock
        }
        return serverBlock
      })

      set({
        resumeSkillsData: mergedData,
        hasResumeSkillData: !!mergedData?.length,
        loading: false,
        error: null,
        savesInFlight: updatedInFlight,
      })

      const returnValue = { error: null }

      // Check if there's a pending save for this specific block
      if (currentState.pendingSaveResumeSkills.has(block.id)) {
        const nextBlock = currentState.pendingSaveResumeSkills.get(block.id)!
        const newPending = new Map(currentState.pendingSaveResumeSkills)
        newPending.delete(block.id)
        set({ pendingSaveResumeSkills: newPending })

        // Calculate the new previousData for the next save
        const nextPreviousData = mergedData
        return executeResumeSkillSave(nextBlock, nextPreviousData, set, get)
      }

      return returnValue
    } else {
      // On error, merge with current state to preserve other optimistic updates
      const currentState = get()
      const mergedData = previousData.map((prevBlock) => {
        if (
          updatedInFlight.has(prevBlock.id) ||
          currentState.pendingSaveResumeSkills.has(prevBlock.id) ||
          blockDebounceTimers.has(prevBlock.id)
        ) {
          const currentBlock = currentState.resumeSkillsData.find(
            (b) => b.id === prevBlock.id
          )
          return currentBlock || prevBlock
        }
        return prevBlock
      })

      set({
        resumeSkillsData: mergedData,
        hasResumeSkillData: !!mergedData?.length,
        loading: false,
        error: result.error,
        savesInFlight: updatedInFlight,
      })

      const returnValue = { error: result.error }

      // Check if there's a pending save for this specific block
      if (currentState.pendingSaveResumeSkills.has(block.id)) {
        const nextBlock = currentState.pendingSaveResumeSkills.get(block.id)!
        const newPending = new Map(currentState.pendingSaveResumeSkills)
        newPending.delete(block.id)
        set({ pendingSaveResumeSkills: newPending })
        return executeResumeSkillSave(nextBlock, mergedData, set, get)
      }

      return returnValue
    }
  } catch (error) {
    const operationError = createUnknownError(
      'Failed to save resume skill block',
      error
    )

    const currentState = get()
    const updatedInFlight = new Set(currentState.savesInFlight)
    updatedInFlight.delete(block.id)

    // On error, merge with current state to preserve other optimistic updates
    const mergedData = previousData.map((prevBlock) => {
      if (
        updatedInFlight.has(prevBlock.id) ||
        currentState.pendingSaveResumeSkills.has(prevBlock.id) ||
        blockDebounceTimers.has(prevBlock.id)
      ) {
        const currentBlock = currentState.resumeSkillsData.find(
          (b) => b.id === prevBlock.id
        )
        return currentBlock || prevBlock
      }
      return prevBlock
    })

    set({
      resumeSkillsData: mergedData,
      hasResumeSkillData: !!mergedData?.length,
      loading: false,
      error: operationError,
      savesInFlight: updatedInFlight,
    })

    const returnValue = { error: operationError }

    // Check if there's a pending save for this specific block
    if (currentState.pendingSaveResumeSkills.has(block.id)) {
      const nextBlock = currentState.pendingSaveResumeSkills.get(block.id)!
      const newPending = new Map(currentState.pendingSaveResumeSkills)
      newPending.delete(block.id)
      set({ pendingSaveResumeSkills: newPending })
      return executeResumeSkillSave(nextBlock, mergedData, set, get)
    }

    return returnValue
  }
}
