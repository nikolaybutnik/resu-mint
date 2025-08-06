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

export default function Home() {
  const [view, setView] = useState<string>(MOBILE_VIEW.INPUT)
  const [welcomeState, setWelcomeState] =
    useState<WelcomeExperienceState | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const state = shouldShowWelcomeExperience()
    setWelcomeState(state)
  }, [])

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
