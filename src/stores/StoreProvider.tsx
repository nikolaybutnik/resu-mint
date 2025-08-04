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
  useAuthStore,
} from './'
import { Subscription } from '@supabase/supabase-js'

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
  const initUser = useAuthStore((state) => state.initialize)

  useEffect(() => {
    let authSubscription: Subscription | null = null

    const initAuth = async () => {
      authSubscription = (await initUser()) || null
    }

    initAuth()

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    initPersonalDetails()
    initSettings()
    initExperience()
    initJobDetails()
    initAiState()
    initProject()
    initEducation()
    initSkills()
  }, [
    initPersonalDetails,
    initSettings,
    initExperience,
    initJobDetails,
    initAiState,
    initProject,
    initEducation,
    initSkills,
  ])

  return <>{children}</>
}
