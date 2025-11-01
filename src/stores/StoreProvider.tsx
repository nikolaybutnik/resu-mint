'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
import { DbErrorHandler } from '@/components/shared/DbErrorHandler/DbErrorHandler'
import { ROUTES } from '@/lib/constants'

/**
 * StoreProvider - Initializes all Zustand stores when the app starts
 * This runs once at the root level to ensure stores are ready
 */
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter()
  const pathname = usePathname()
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

  const { db, initializing } = useDbStore()

  useAuthListener()

  useEffect(() => {
    initDb()
  }, [initDb])

  useEffect(() => {
    if (!initializing && db) {
      initPersonalDetails()
      initSettings()
      initExperience()
      initJobDetails()
      initAiState()
      initProject()
      initEducation()
      initSkills()
    }
  }, [db, initializing])

  // Prefetch routes after component mounts to avoid CSS loading delays
  useEffect(() => {
    const timer = setTimeout(() => {
      const flattenRoutes = (
        obj: Record<string, string | Record<string, string>>
      ): string[] => {
        return Object.values(obj).flatMap((value) =>
          typeof value === 'string' ? [value] : flattenRoutes(value)
        )
      }

      flattenRoutes(ROUTES).forEach((route) => {
        if (route !== pathname) {
          router.prefetch(route)
        }
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [router, pathname])

  return (
    <>
      <DbErrorHandler />
      {children}
    </>
  )
}
