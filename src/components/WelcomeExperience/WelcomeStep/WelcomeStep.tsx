import styles from './WelcomeStep.module.scss'

interface WelcomeStepProps {
  onContinue: () => void
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onContinue }) => {
  return (
    <div className={styles.welcomeScreen}>
      <div className={styles.welcomeFeatures}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🤖</div>
          <h3>AI-Optimized ATS Compatibility</h3>
          <p>
            Our AI fine-tunes your resume to match job criteria, helping you
            rank higher in the Applicant Tracking System
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>⚡</div>
          <h3>Build Once, Apply Often</h3>
          <p>
            Enter your skills and experience just once, then effortlessly target
            any job with a tailored resume
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🎯</div>
          <h3>Swift Resume Customization</h3>
          <p>
            Take control and adapt your resume in seconds, streamlining your
            application workflow to never miss an opportunity
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>💼</div>
          <h3>Apply With Confidence</h3>
          <p>
            Feel ready to impress, knowing your resume is crafted to capture
            hiring managers&apos; attention
          </p>
        </div>
      </div>
      <button
        type='button'
        className={styles.getStartedButton}
        onClick={onContinue}
      >
        Get Started
      </button>
    </div>
  )
}
