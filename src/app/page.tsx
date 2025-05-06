import styles from './page.module.scss'
import { ResumeForm } from '@/components/ResumeForm/ResumeForm'

export default function Home() {
  return (
    <div className={styles.appWrapper}>
      <header className={styles.header}>
        <h1>ResuMint</h1>
      </header>
      <main className={styles.container}>
        <ResumeForm />
      </main>
    </div>
  )
}
