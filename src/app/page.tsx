'use client'

import styles from './page.module.scss'
import { FormsContainer } from '@/components/FormsContainer/FormsContainer'
import { useState } from 'react'
import { MOBILE_VIEW } from '@/lib/constants'

export default function Home() {
  const [view, setView] = useState<string>(MOBILE_VIEW.INPUT)

  return (
    <div className={styles.appWrapper}>
      <header className={styles.header}>
        <h1>ResuMint</h1>
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
