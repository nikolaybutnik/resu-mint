'use client'

import styles from './page.module.scss'
import { FormsContainer } from '@/components/FormsContainer/FormsContainer'
import { WelcomeExperience } from '@/components/WelcomeExperience/WelcomeExperience/WelcomeExperience'
import { useState, useEffect } from 'react'
import { MOBILE_VIEW } from '@/lib/constants'
import {
  shouldShowWelcomeExperience,
  WelcomeExperienceState,
} from '@/lib/utils'
import AccountMenu from '@/components/AccountMenu/AccountMenu'
import { useAuthStore } from '@/stores'
import { toast } from '@/stores/toastStore'

export default function Home() {
  const { user } = useAuthStore()

  const [view, setView] = useState<string>(MOBILE_VIEW.INPUT)
  const [welcomeState, setWelcomeState] =
    useState<WelcomeExperienceState | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [previousUser, setPreviousUser] = useState<typeof user>(null)

  // TODO: re-enable welcome experience when sync mechanism is completed
  useEffect(() => {
    setIsClient(true)
    //   const state = shouldShowWelcomeExperience()
    const state = { shouldShow: false, startStep: 0, completedSteps: [] }
    setWelcomeState(state)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const wasLoggedIn = previousUser !== null
    const isNowLoggedIn = user !== null

    if (!wasLoggedIn && isNowLoggedIn) {
      if (user.created_at && user.updated_at) {
        const createdAt = new Date(user.created_at)
        const updatedAt = new Date(user.updated_at)
        const timeDiffSeconds =
          Math.abs(updatedAt.getTime() - createdAt.getTime()) / 1000

        if (timeDiffSeconds <= 10) {
          toast.success(
            'Welcome to ResuMint! Your account has been created successfully.'
          )
        } else {
          toast.success('Login successful, welcome back to ResuMint!')
        }
      } else {
        toast.success('Login successful, welcome back to ResuMint!')
      }
    } else if (wasLoggedIn && !isNowLoggedIn) {
      toast.success('You have been signed out successfully.')
    }

    setPreviousUser(user)
  }, [user, previousUser, isClient])

  const handleWelcomeComplete = () => {
    // Re-check the welcome state after completion
    const newState = shouldShowWelcomeExperience()
    setWelcomeState(newState)
  }

  if (!isClient || !welcomeState) {
    return null
  }

  if (welcomeState.shouldShow) {
    return (
      <WelcomeExperience
        welcomeState={welcomeState}
        onComplete={handleWelcomeComplete}
      />
    )
  }

  return (
    <div className={styles.appWrapper}>
      <header className={styles.header}>
        <div className={styles.headerSpacer}></div>

        <h1>ResuMint</h1>

        <div className={styles.accountManagement}>
          <AccountMenu />
        </div>
      </header>
      <main className={styles.container}>
        <FormsContainer view={view} />
      </main>
      <div className={styles.bottomNav}>
        <button
          className={`${styles.navItem} ${
            view === MOBILE_VIEW.INPUT ? styles.active : ''
          }`}
          onClick={() => setView(MOBILE_VIEW.INPUT)}
        >
          Input
        </button>
        <button
          className={`${styles.navItem} ${
            view === MOBILE_VIEW.PREVIEW ? styles.active : ''
          }`}
          onClick={() => setView(MOBILE_VIEW.PREVIEW)}
        >
          Preview
        </button>
      </div>
    </div>
  )
}
