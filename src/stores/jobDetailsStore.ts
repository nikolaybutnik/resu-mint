import { JobDescriptionAnalysis } from '@/lib/types/api'
import { JobDetails } from '@/lib/types/jobDetails'
import { DEFAULT_STATE_VALUES } from '@/lib/constants'
import { create } from 'zustand'
import { dataManager } from '@/lib/data/dataManager'

interface JobDetailsStore {
  data: JobDetails
  loading: boolean
  initializing: boolean
  hasJobDescription: boolean
  hasAnalysis: boolean
  initialize: () => Promise<void>
  saveJobDescription: (data: string) => Promise<void>
  saveAnalysis: (data: JobDescriptionAnalysis) => Promise<void>
  refresh: () => Promise<void>
}

export const useJobDetailsStore = create<JobDetailsStore>((set, get) => ({
  data: DEFAULT_STATE_VALUES.JOB_DETAILS,
  loading: false,
  initializing: true,
  hasJobDescription: false,
  hasAnalysis: false,

  initialize: async () => {
    set({ loading: true })
    try {
      const data = (await dataManager.getJobDetails()) as JobDetails
      set({
        data,
        loading: false,
        initializing: false,
        hasJobDescription: !!data?.originalJobDescription,
        hasAnalysis: !!data.analysis?.jobSummary,
      })
    } catch (error) {
      console.error('ExperienceStore: initialization error:', error)
      set({ loading: false, initializing: false })
    }
  },

  saveJobDescription: async (data: string) => {
    try {
      set({ loading: true })
      await dataManager.saveJobDescription(data)
      set({
        loading: false,
        data: { ...get().data, originalJobDescription: data },
        hasJobDescription: !!data,
      })
    } catch (error) {
      console.error('JobDetailsStore: saveJobDescription error:', error)
      const currentState = get()
      set({
        loading: false,
        data: currentState.data,
      })
    }
  },

  saveAnalysis: async (data: JobDescriptionAnalysis) => {
    try {
      set({ loading: true })
      await dataManager.saveAnalysis(data)
      set({
        loading: false,
        data: { ...get().data, analysis: data },
        hasAnalysis: !!data.jobSummary,
      })
    } catch (error) {
      console.error('JobDetailsStore: saveAnalysis error:', error)
      const currentState = get()
      set({
        loading: false,
        data: currentState.data,
      })
    }
  },

  refresh: async () => {
    try {
      set({ loading: true })
      dataManager.invalidateJobDetails()
      const data = (await dataManager.getJobDetails()) as JobDetails
      set({
        data,
        loading: false,
        hasJobDescription: !!data?.originalJobDescription,
        hasAnalysis: !!data.analysis?.jobSummary,
      })
    } catch (error) {
      console.error('JobDetailsStore: refresh error:', error)
      set({ loading: false })
    }
  },
}))
