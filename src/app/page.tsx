import styles from './page.module.scss'
import { FormsContainer } from '@/components/FormsContainer/FormsContainer'

export default function Home() {
  return (
    <div className={styles.appWrapper}>
      <header className={styles.header}>
        <h1>ResuMint</h1>
      </header>
      <main className={styles.container}>
        <FormsContainer />
      </main>
    </div>
  )
}
