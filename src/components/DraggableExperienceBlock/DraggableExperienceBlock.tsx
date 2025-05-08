import {
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaGripVertical,
  FaPen,
} from 'react-icons/fa'
import { ExperienceBlockData } from '../EditableExperienceBlock/EditableExperienceBlock'
import styles from './DraggableExperienceBlock.module.scss'
import { useState } from 'react'

interface DraggableExperienceBlockProps {
  data: ExperienceBlockData
  onBlockSelect: (id: string) => void
}

// TODO: add drag and drop functionality with dnd-kit

export const DraggableExperienceBlock: React.FC<
  DraggableExperienceBlockProps
> = ({ data, onBlockSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={styles.draggableExperienceBlockContainer}>
      <div className={styles.draggableExperienceBlock}>
        <div className={styles.experienceBlockContent}>
          <h3 className={styles.experienceBlockHeader}>{data.jobTitle}</h3>
          <p className={styles.experienceBlockCompany}>{data.companyName}</p>
          <p className={styles.experienceBlockLocation}>{data.location}</p>
          <p className={styles.experienceBlockDate}>
            {`${data.startDate.month} ${data.startDate.year} -
            ${
              data.endDate.isPresent
                ? 'Present'
                : `${data.endDate.month} ${data.endDate.year}`
            }`}
          </p>
        </div>
        <div className={styles.experienceBlockActions}>
          <button
            type='button'
            className={styles.editButton}
            onClick={() => onBlockSelect(data.id)}
          >
            <FaPen />
          </button>
          <div className={styles.experienceBlockDraggableArea}>
            <FaGripVertical />
          </div>
        </div>
      </div>

      {data.bulletPoints.length > 0 && (
        <button
          className={styles.drawerToggleButton}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      )}

      <div
        className={`${styles.experienceBlockDrawer} ${
          isExpanded ? styles.expanded : ''
        }`}
      >
        {data.bulletPoints.map((bullet, index) => (
          <p key={index} className={styles.experienceBlockBullet}>
            {bullet}
          </p>
        ))}
      </div>
    </div>
  )
}
