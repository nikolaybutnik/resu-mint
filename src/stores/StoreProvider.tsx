'use client'

import { useEffect } from 'react'
import { usePersonalDetailsStore } from './personalDetailsStore'
import { useSettingsStore } from './settingsStore'
import { useExperienceStore } from './experienceStore'
import { useJobDetailsStore } from './jobDetailsStore'
import { useAiStateStore } from './aiStateStore'

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

  useEffect(() => {
    initPersonalDetails()
    initSettings()
    initExperience()
    initJobDetails()
    initAiState()
  }, [
    initPersonalDetails,
    initSettings,
    initExperience,
    initJobDetails,
    initAiState,
  ])

  return <>{children}</>
}
