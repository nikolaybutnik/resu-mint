import { api } from './api'
import { ROUTES } from '@/lib/constants'
import { Skills } from '@/lib/types/skills'
import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'
import { AppSettings } from '@/lib/types/settings'
import {
  GenerateSkillSuggestionsRequest,
  GenerateSkillSuggestionsResponse,
} from '../types/api'

const generateSuggestionsApi = async (
  params: GenerateSkillSuggestionsRequest
): Promise<GenerateSkillSuggestionsResponse> => {
  try {
    const response = await api.post<
      GenerateSkillSuggestionsRequest,
      GenerateSkillSuggestionsResponse
    >(ROUTES.GENERATE_SKILL_SUGGESTIONS, params)

    return {
      hardSkillSuggestions: response.hardSkillSuggestions || [],
      softSkillSuggestions: response.softSkillSuggestions || [],
    }
  } catch (error) {
    console.error('Error generating skill suggestions:', error)
    throw new Error('Failed to generate skill suggestions')
  }
}

export const skillsService = {
  generateSuggestions: async (
    jobAnalysis: JobDescriptionAnalysis,
    currentSkills: Skills,
    userExperience: string[],
    settings: AppSettings
  ): Promise<GenerateSkillSuggestionsResponse> => {
    const payload: GenerateSkillSuggestionsRequest = {
      jobAnalysis,
      currentSkills,
      userExperience,
      settings,
    }

    return generateSuggestionsApi(payload)
  },
}
