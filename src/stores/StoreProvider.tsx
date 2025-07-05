'use client'

import { useEffect } from 'react'
import { usePersonalDetailsStore } from './personalDetailsStore'
import { useSettingsStore } from './settingsStore'
import { useExperienceStore } from './experienceStore'

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

  useEffect(() => {
    initPersonalDetails()
    initSettings()
    initExperience()
  }, [initPersonalDetails, initSettings, initExperience])

  return <>{children}</>
}
