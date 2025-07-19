import { useEffect, useRef, useState } from 'react'
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
  const isInitialLoadRef = useRef(true)

  const [isGenerating, setIsGenerating] = useState(false)

  const { data: jobDetails } = useJobDetailsStore()
  const { data: experience } = useExperienceStore()
  const { data: projects } = useProjectStore()
  const { data: skills, save: saveSkills } = useSkillsStore()
  const { data: settings } = useSettingsStore()

  const generateSuggestions = async () => {
    try {
      setIsGenerating(true)

      const hasContent =
        experience.some(
          (exp) => exp.isIncluded && exp.bulletPoints.length > 0
        ) ||
        projects.some((proj) => proj.isIncluded && proj.bulletPoints.length > 0)

      if (!hasContent) return

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

      if (userExperience.length === 0) return

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
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    const currentAnalysis = jobDetails.analysis

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      prevAnalysisRef.current = currentAnalysis
      return
    }

    if (!currentAnalysis || currentAnalysis === prevAnalysisRef.current) return

    generateSuggestions()
    prevAnalysisRef.current = currentAnalysis
  }, [jobDetails.analysis, experience, projects, skills, settings, saveSkills])

  return {
    isGenerating,
    generateSuggestions,
  }
}
