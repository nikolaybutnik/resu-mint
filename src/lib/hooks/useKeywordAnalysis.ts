import { useMemo } from 'react'
import { ExperienceBlockData } from '../types/experience'
import { ProjectBlockData } from '../types/projects'
import { JobDescriptionAnalysis } from '../types/jobDetails'
import { KeywordUtils } from '../keywordUtils'
import {
  KeywordAnalysis,
  KeywordUsageStats,
  KeywordPriority,
  KeywordAlignment,
  KeywordData,
} from '../types/keywords'

export const useKeywordAnalysis = (
  workExperience: ExperienceBlockData[],
  projects: ProjectBlockData[],
  jobDescriptionAnalysis: JobDescriptionAnalysis | null
): KeywordData => {
  const keywordAnalysis: KeywordAnalysis = useMemo(
    () => ({
      hardSkills: jobDescriptionAnalysis?.skillsRequired?.hard || [],
      softSkills: jobDescriptionAnalysis?.skillsRequired?.soft || [],
      contextualSkills: jobDescriptionAnalysis?.contextualSkills || [],
    }),
    [jobDescriptionAnalysis]
  )

  const usageStats: KeywordUsageStats[] = useMemo(
    () =>
      KeywordUtils.analyzeKeywordUsage(
        workExperience,
        projects,
        keywordAnalysis
      ),
    [workExperience, projects, keywordAnalysis]
  )

  const priority: KeywordPriority = useMemo(
    () => KeywordUtils.categorizeKeywordsByPriority(usageStats),
    [usageStats]
  )

  const promptKeywords: {
    priorityKeywords: string[]
    excludeKeywords: string[]
  } = useMemo(() => KeywordUtils.getPromptKeywords(priority), [priority])

  const alignment: KeywordAlignment = useMemo(
    () => KeywordUtils.calculateKeywordAlignment(usageStats, keywordAnalysis),
    [usageStats, keywordAnalysis]
  )

  return {
    keywordAnalysis,
    usageStats,
    priority,
    promptKeywords,
    alignment,
  }
}
