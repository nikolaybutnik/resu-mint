'use client'

import { useEffect } from 'react'
import {
  usePersonalDetailsStore,
  useSettingsStore,
  useExperienceStore,
  useJobDetailsStore,
  useAiStateStore,
  useProjectStore,
  useEducationStore,
  useSkillsStore,
  useDbStore,
} from './'
import { useAuthListener } from '@/lib/hooks'

/**
 * StoreProvider - Initializes all Zustand stores when the app starts
 * This runs once at the root level to ensure stores are ready
 */
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initPersonalDetails = usePersonalDetailsStore(
    (state) => state.initialize
  )
  const initSettings = useSettingsStore((state) => state.initialize)
  const initExperience = useExperienceStore((state) => state.initialize)
  const initJobDetails = useJobDetailsStore((state) => state.initialize)
  const initAiState = useAiStateStore((state) => state.initialize)
  const initProject = useProjectStore((state) => state.initialize)
  const initEducation = useEducationStore((state) => state.initialize)
  const initSkills = useSkillsStore((state) => state.initialize)
  const initDb = useDbStore((state) => state.initialize)

  useAuthListener()

  useEffect(() => {
    initPersonalDetails()
    initSettings()
    initExperience()
    initJobDetails()
    initAiState()
    initProject()
    initEducation()
    initSkills()
    initDb()
  }, [
    initPersonalDetails,
    initSettings,
    initExperience,
    initJobDetails,
    initAiState,
    initProject,
    initEducation,
    initSkills,
    initDb,
  ])

  return <>{children}</>
}
