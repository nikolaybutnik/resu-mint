'use client'

import { useEffect } from 'react'
import { usePersonalDetailsStore } from './personalDetailsStore'
import { useSettingsStore } from './settingsStore'

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

  useEffect(() => {
    initPersonalDetails()
    initSettings()
  }, [initPersonalDetails, initSettings])

  return <>{children}</>
}
