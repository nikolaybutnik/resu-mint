import styles from './SkeletonButton.module.scss'

interface SkeletonButtonProps {
  variant?: 'primary' | 'secondary' | 'text' | 'skip'
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  variant = 'primary',
}) => (
  <div className={`${styles.skeletonButton} ${styles[variant]}`}>
    <span className={styles.skeletonButtonText}>Loading</span>
  </div>
)
