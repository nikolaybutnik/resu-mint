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
  initialize: () => Promise<void>
  upsertSkills: (skills: Skills) => Promise<{ error: OperationError | null }>
  upsertResumeSkillBlock: (
    block: SkillBlock
  ) => Promise<{ error: OperationError | null }>
  // deleteResumeSkillBlock: (
  //   blockId: string
  // ) => Promise<{ error: OperationError | null }>
  // reorderResumeSkillBlocks: (
  //   blocks: SkillBlock[]
  // ) => Promise<{ error: OperationError | null }>
  refresh: () => Promise<void>
  skillsHaveChanges: (newData: Skills) => boolean
  resumeSkillBlockHasChanges: (
    blockId: string,
    newBlockData: SkillBlock
  ) => boolean
  clearError: () => void
}

let debouncedSkillsSave: ReturnType<typeof debounce> | null = null
let debouncedResumeSkillsSave: ReturnType<typeof debounce> | null = null
let lastSavedSkillsState: Skills = DEFAULT_STATE_VALUES.SKILLS
let lastSavedResumeSkillsState: SkillBlock[] =
  DEFAULT_STATE_VALUES.RESUME_SKILLS
let debouncedRefresh: ReturnType<typeof debounce> | null = null

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

  if (!debouncedResumeSkillsSave) {
    debouncedResumeSkillsSave = debounce(async (block: SkillBlock) => {
      set({ loading: true, error: null })

      const result = await dataManager.saveResumeSkillBlock(block)

      if (result.success) {
        lastSavedResumeSkillsState = result.data
        set({
          resumeSkillsData: result.data,
          loading: false,
          hasResumeSkillData: !!result.data?.length,
          error: null,
        })
      } else {
        set({
          loading: false,
          resumeSkillsData: lastSavedResumeSkillsState,
          hasResumeSkillData: !!lastSavedResumeSkillsState?.length,
          error: result.error,
        })
      }
    }, 1000)
  }

  if (!debouncedRefresh) {
    debouncedRefresh = debounce(async () => {
      try {
        set({ loading: true, error: null })
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        lastSavedSkillsState = skillsData
        lastSavedResumeSkillsState = resumeSkillsData
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

    initialize: async () => {
      set({ loading: true, error: null })
      try {
        const skillsData = (await dataManager.getSkills()) as Skills
        const resumeSkillsData =
          (await dataManager.getResumeSkills()) as SkillBlock[]
        lastSavedSkillsState = skillsData
        lastSavedResumeSkillsState = resumeSkillsData
        console.log('resumeSkillsData', resumeSkillsData)

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

      debouncedResumeSkillsSave?.(block)

      return { error: null }
    },

    // deleteResumeSkillBlock: async (blockId: string) => {
    //   const currentState = get()
    //   const previousData = currentState.resumeSkillsData

    //   const optimisticData = currentState.resumeSkillsData.filter(
    //     (block) => block.id !== blockId
    //   )

    //   set({
    //     resumeSkillsData: optimisticData,
    //     hasResumeSkillData: !!optimisticData.length,
    //     error: null,
    //   })

    //   const result = await dataManager.deleteResumeSkillBlock(blockId)

    //   if (result.success) {
    //     lastSavedResumeSkillsState = result.data
    //     set({
    //       resumeSkillsData: result.data,
    //       hasResumeSkillData: !!result.data.length,
    //       error: null,
    //     })
    //   } else {
    //     set({
    //       resumeSkillsData: previousData,
    //       hasResumeSkillData: !!previousData.length,
    //       error: result.error,
    //     })
    //   }

    //   return { error: result.success ? null : result.error }
    // },

    // reorderResumeSkillBlocks: async (blocks: SkillBlock[]) => {
    //   const previousData = get().resumeSkillsData
    //   const optimisticWithPositions = blocks.map((block, i) => ({
    //     ...block,
    //     position: i,
    //   }))

    //   set({
    //     resumeSkillsData: optimisticWithPositions,
    //     hasResumeSkillData: !!optimisticWithPositions.length,
    //     error: null,
    //   })

    //   const result = await dataManager.reorderResumeSkillBlocks(
    //     optimisticWithPositions
    //   )

    //   if (result.success) {
    //     lastSavedResumeSkillsState = result.data
    //     set({
    //       resumeSkillsData: result.data,
    //       hasResumeSkillData: !!result.data.length,
    //       error: null,
    //     })
    //   } else {
    //     set({
    //       resumeSkillsData: previousData,
    //       hasResumeSkillData: !!previousData.length,
    //       error: result.error,
    //     })
    //   }

    //   return { error: result.success ? null : result.error }
    // },

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
