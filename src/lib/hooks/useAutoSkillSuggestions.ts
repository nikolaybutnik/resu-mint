import { useEffect, useRef, useState } from 'react'
import { isEqual } from 'lodash'
import {
  useJobDetailsStore,
  useExperienceStore,
  useProjectStore,
  useSkillsStore,
  useSettingsStore,
} from '@/stores'
import { skillsService } from '@/lib/services'
import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'
import { Skills } from '@/lib/types/skills'

export const useAutoSkillSuggestions = () => {
  const prevAnalysisRef = useRef<JobDescriptionAnalysis | null>(null)
  const hasInitializedRef = useRef(false)

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: jobDetails, initializing: jobDetailsInitializing } =
    useJobDetailsStore()
  const { data: experience, initializing: experienceInitializing } =
    useExperienceStore()
  const { data: projects, initializing: projectsInitializing } =
    useProjectStore()
  const {
    data: skills,
    save: saveSkills,
    initializing: skillsInitializing,
  } = useSkillsStore()
  const { data: settings, initializing: settingsInitializing } =
    useSettingsStore()

  const generateSuggestions = async () => {
    try {
      setIsGenerating(true)
      setError(null)

      const hasContent =
        experience.some(
          (exp) =>
            exp.isIncluded || (exp.bulletPoints && exp.bulletPoints.length > 0)
        ) ||
        projects.some(
          (proj) =>
            proj.isIncluded ||
            (proj.bulletPoints && proj.bulletPoints.length > 0)
        )

      if (!hasContent) {
        setError(
          'No content available for skill suggestions. Please add descriptions or bullet points to your experience and/or projects.'
        )
        return
      }

      const userExperience: string[] = []

      experience
        .filter((exp) => exp.isIncluded)
        .forEach((exp) => {
          if (exp.description?.trim()) {
            userExperience.push(exp.description.trim())
          }
          exp.bulletPoints?.forEach((bullet) => {
            if (bullet.text?.trim()) {
              userExperience.push(bullet.text.trim())
            }
          })
        })

      projects
        .filter((proj) => proj.isIncluded)
        .forEach((proj) => {
          if (proj.description?.trim()) {
            userExperience.push(proj.description.trim())
          }
          proj.bulletPoints?.forEach((bullet) => {
            if (bullet.text?.trim()) {
              userExperience.push(bullet.text.trim())
            }
          })
        })

      if (userExperience.length === 0) {
        setError(
          'No content available for skill suggestions. Please add descriptions or bullet points to your experience and/or projects.'
        )
        return
      }

      const suggestions = await skillsService.generateSuggestions(
        jobDetails.analysis,
        skills,
        userExperience,
        settings
      )

      const updatedSkills: Skills = {
        ...skills,
        hardSkills: {
          ...skills.hardSkills,
          suggestions: [
            ...skills.hardSkills.suggestions,
            ...suggestions.hardSkillSuggestions,
          ].slice(-10),
        },
        softSkills: {
          ...skills.softSkills,
          suggestions: [
            ...skills.softSkills.suggestions,
            ...suggestions.softSkillSuggestions,
          ].slice(-10),
        },
      }

      await saveSkills(updatedSkills)
    } catch (error) {
      console.error('Failed to auto-generate skill suggestions:', error)

      let errorMessage = 'Failed to generate skill suggestions'

      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage =
            'Network error: Unable to connect to skill suggestion service'
        } else if (error.message.includes('validation')) {
          errorMessage = 'Data validation error: Invalid request format'
        } else if (
          error.message.includes('OpenAI') ||
          error.message.includes('AI')
        ) {
          errorMessage = 'AI service error: Unable to generate suggestions'
        } else if (error.message.includes('timeout')) {
          errorMessage =
            'Request timeout: Skill suggestion service took too long to respond'
        } else {
          errorMessage = `Skill suggestion error: ${error.message}`
        }
      }

      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    const currentAnalysis = jobDetails.analysis

    const anyStoreInitializing =
      jobDetailsInitializing ||
      experienceInitializing ||
      projectsInitializing ||
      skillsInitializing ||
      settingsInitializing

    if (anyStoreInitializing) {
      return
    }

    if (!currentAnalysis) {
      return
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      prevAnalysisRef.current = currentAnalysis
      return
    }

    const previousAnalysis = prevAnalysisRef.current

    const currentJobKey = {
      jobTitle: currentAnalysis.jobTitle,
      companyName: currentAnalysis.companyName,
      jobSummary: currentAnalysis.jobSummary,
      skillsRequired: currentAnalysis.skillsRequired,
    }

    const previousJobKey = previousAnalysis
      ? {
          jobTitle: previousAnalysis.jobTitle,
          companyName: previousAnalysis.companyName,
          jobSummary: previousAnalysis.jobSummary,
          skillsRequired: previousAnalysis.skillsRequired,
        }
      : null

    if (isEqual(currentJobKey, previousJobKey)) return

    generateSuggestions()
    prevAnalysisRef.current = currentAnalysis
  }, [
    jobDetails.analysis,
    experience,
    projects,
    skills,
    settings,
    jobDetailsInitializing,
    experienceInitializing,
    projectsInitializing,
    skillsInitializing,
    settingsInitializing,
  ])

  return {
    isGenerating,
    generateSuggestions,
    error,
  }
}
