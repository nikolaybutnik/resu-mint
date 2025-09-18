import styles from './SkeletonDraggableBlock.module.scss'
import React from 'react'

export const SkeletonDraggableBlock: React.FC = () => (
  <div className={styles.skeletonDraggableBlock}>
    <div className={styles.experienceBlockContent}>
      <h3 className={styles.experienceBlockHeader}></h3>
      <p className={styles.experienceBlockCompany}></p>
      <p className={styles.experienceBlockDate}></p>
    </div>
    <div className={styles.experienceBlockActions}>
      <div className={styles.skeletonButton}></div>
      <div className={styles.skeletonButton}></div>
    </div>
  </div>
)
