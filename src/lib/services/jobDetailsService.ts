import { dataManager } from '@/lib/data/dataManager'
import { useJobDetailsStore, useSettingsStore } from '@/stores'
import {
  jobDescriptionAnalysisSchema,
  jobDescriptionSchema,
} from '../validationSchemas'
import {
  AnalyzeJobDescriptionRequest,
  JobDescriptionAnalysis,
} from '../types/api'
import { api } from './api'
import { ROUTES } from '../constants'

export const jobDetailsService = {
  saveJobDescription: async (data: string): Promise<void> => {
    if (!data) return

    try {
      const validation = jobDescriptionSchema.safeParse(data)

      if (!validation.success) {
        throw new Error(validation.error.message)
      }

      await dataManager.saveJobDescription(data)

      const jobDetailsStore = useJobDetailsStore.getState()

      await jobDetailsStore.saveJobDescription(data)
    } catch (error) {
      console.error('Error saving job description:', error)
      throw new Error('Failed to save job description')
    }
  },

  analyzeJobDescription: async (data: string): Promise<void> => {
    if (!data) return

    try {
      const validation = jobDescriptionSchema.safeParse(data)

      if (!validation.success) {
        throw new Error(validation.error.message)
      }

      const { data: settings } = useSettingsStore.getState()

      const payload: AnalyzeJobDescriptionRequest = {
        jobDescription: data,
        settings,
      }

      const response = await api.post<
        AnalyzeJobDescriptionRequest,
        JobDescriptionAnalysis
      >(ROUTES.ANALYZE_JOB_DESCRIPTION, payload)

      const validationResult = jobDescriptionAnalysisSchema.safeParse(response)

      if (!validationResult.success) {
        console.error('Validation errors:', validationResult.error.flatten())
        throw new Error('Failed to analyze job description')
      }

      const analysis = validationResult.data as JobDescriptionAnalysis

      await dataManager.saveAnalysis(analysis)

      const jobDetailsStore = useJobDetailsStore.getState()
      await jobDetailsStore.saveAnalysis(analysis)
    } catch (error) {
      console.error('Error analyzing job description:', error)
      throw new Error('Failed to analyze job description')
    }
  },
}
