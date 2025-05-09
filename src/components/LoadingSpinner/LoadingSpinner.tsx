import React from 'react'
import styles from './LoadingSpinner.module.scss'

interface LoadingSpinnerProps {
  variant?: 'primary' | 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  overlay?: boolean
  text?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'primary',
  size = 'md',
  overlay = false,
  text,
}) => {
  return (
    <div
      className={`${styles.wrapper} ${overlay ? styles.overlay : ''}`}
      role='status'
      aria-busy='true'
      aria-label={text || 'Loading'}
    >
      <div className={`${styles.spinner} ${styles[variant]} ${styles[size]}`}>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
      </div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  )
}

export default LoadingSpinner
