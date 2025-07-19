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
  const [debugInfo, setDebugInfo] = useState<string>('')

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
      setDebugInfo('AutoSkill: INSIDE_GENERATE_START')

      const hasContent =
        experience.some(
          (exp) => exp.isIncluded && exp.bulletPoints.length > 0
        ) ||
        projects.some((proj) => proj.isIncluded && proj.bulletPoints.length > 0)

      if (!hasContent) {
        setDebugInfo('AutoSkill: NO_CONTENT_FOUND')
        return
      }

      const userExperience: string[] = []

      experience
        .filter((exp) => exp.isIncluded)
        .forEach((exp) => {
          if (exp.description?.trim()) {
            userExperience.push(exp.description.trim())
          }
          exp.bulletPoints.forEach((bullet) => {
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
          proj.bulletPoints.forEach((bullet) => {
            if (bullet.text?.trim()) {
              userExperience.push(bullet.text.trim())
            }
          })
        })

      if (userExperience.length === 0) {
        setDebugInfo('AutoSkill: NO_USER_EXPERIENCE')
        return
      }

      setDebugInfo(`AutoSkill: CALLING_API (${userExperience.length} items)`)

      const suggestions = await skillsService.generateSuggestions(
        jobDetails.analysis,
        skills,
        userExperience,
        settings
      )

      setDebugInfo('AutoSkill: API_SUCCESS')

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
      setDebugInfo('AutoSkill: COMPLETED_SUCCESS')
    } catch (error) {
      console.error('Failed to auto-generate skill suggestions:', error)
      setDebugInfo(
        `AutoSkill: ERROR - ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
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

    const debugMsg = `AutoSkill: init=${anyStoreInitializing}, hasAnalysis=${!!currentAnalysis}, initialized=${
      hasInitializedRef.current
    }, mobile=${
      typeof window !== 'undefined' ? window.innerWidth < 768 : false
    }`
    setDebugInfo(debugMsg)

    if (anyStoreInitializing) {
      return
    }

    if (!currentAnalysis) {
      return
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      prevAnalysisRef.current = currentAnalysis
      setDebugInfo(debugMsg + ' | FIRST_RUN')
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

    if (isEqual(currentJobKey, previousJobKey)) {
      setDebugInfo(debugMsg + ' | SAME_JOB')
      return
    }

    setDebugInfo(debugMsg + ' | GENERATING')
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
    debugInfo, // Temporary for mobile debugging
  }
}
