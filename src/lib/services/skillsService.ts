import { api } from './api'
import { ROUTES } from '@/lib/constants'
import { Skills } from '@/lib/types/skills'
import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'
import { AppSettings } from '@/lib/types/settings'
import {
  CategorizeSkillsRequest,
  CategorizeSkillsResponse,
  ExtractSkillsRequest,
  ExtractSkillsResponse,
  GenerateSkillSuggestionsRequest,
  GenerateSkillSuggestionsResponse,
} from '../types/api'
import { ExperienceBlockData } from '../types/experience'
import { ProjectBlockData } from '../types/projects'

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

const extractSkillsApi = async (
  params: ExtractSkillsRequest
): Promise<ExtractSkillsResponse> => {
  try {
    const response = await api.post<
      ExtractSkillsRequest,
      ExtractSkillsResponse
    >(ROUTES.EXTRACT_USER_SKILLS, params)

    return {
      hardSkills: response.hardSkills || [],
      softSkills: response.softSkills || [],
    }
  } catch (error) {
    console.error('Error etracting skills:', error)
    throw new Error('Failed to extract skills')
  }
}

const categorizeSkillsApi = async (
  params: CategorizeSkillsRequest
): Promise<CategorizeSkillsResponse> => {
  try {
    const response = await api.post<
      CategorizeSkillsRequest,
      CategorizeSkillsResponse
    >(ROUTES.CATEGORIZE_USER_SKILLS, params)

    return response
  } catch (error) {
    console.error('Error etracting skills:', error)
    throw new Error('Failed to extract skills')
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

  extractSkills: async (
    workExperience: ExperienceBlockData[],
    projects: ProjectBlockData[],
    currentSkills: Skills,
    settings: AppSettings
  ): Promise<ExtractSkillsResponse> => {
    const payload: ExtractSkillsRequest = {
      experienceSections: workExperience,
      projectSections: projects,
      currentSkills,
      settings,
    }

    return extractSkillsApi(payload)
  },

  categorizeSkills: async (
    jobAnalysis: JobDescriptionAnalysis,
    skills: Skills,
    settings: AppSettings
  ) => {
    const payload: CategorizeSkillsRequest = {
      jobAnalysis,
      skills,
      settings,
    }

    return categorizeSkillsApi(payload)
  },
}
