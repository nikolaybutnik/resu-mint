import styles from './SkeletonRangeInput.module.scss'

interface SkeletonRangeInputProps {
  hasLabel?: boolean
}

export const SkeletonRangeInput: React.FC<SkeletonRangeInputProps> = ({
  hasLabel = true,
}) => (
  <div className={styles.skeletonFormField}>
    {hasLabel && <div className={styles.skeletonFormLabel}>Loading</div>}
    <div className={styles.skeletonRangeInput}>
      <div className={styles.skeletonRangeTrack}>
        <div className={styles.skeletonRangeThumb}></div>
      </div>
    </div>
  </div>
)
