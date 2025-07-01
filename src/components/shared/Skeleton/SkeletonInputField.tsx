import styles from './SkeletonInputField.module.scss'

interface SkeletonInputFieldProps {
  hasLabel?: boolean
}

export const SkeletonInputField: React.FC<SkeletonInputFieldProps> = ({
  hasLabel = true,
}) => (
  <div className={styles.skeletonFormField}>
    {hasLabel && <div className={styles.skeletonFormLabel}>Loading</div>}
    <div className={styles.skeletonFormInput}>
      <span className={styles.skeletonPlaceholder}>Loading</span>
    </div>
  </div>
)
