import styles from './WelcomeStep.module.scss'

interface WelcomeStepProps {
  onGetStarted: () => void
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onGetStarted }) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.welcomeScreen}>
        <div className={styles.welcomeFeatures}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🤖</div>
            <h3>AI-Powered Optimization</h3>
            <p>
              Our AI analyzes job descriptions and tailors your resume content
              for maximum impact
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Quick & Easy</h3>
            <p>
              Create a professional resume in just a few minutes with our guided
              process
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Job-Specific</h3>
            <p>
              Get personalized suggestions based on the specific role
              you&apos;re applying for
            </p>
          </div>
        </div>
        <button
          type='button'
          className={styles.getStartedButton}
          onClick={onGetStarted}
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
