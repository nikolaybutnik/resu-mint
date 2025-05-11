import styles from './DraggableProjectBlock.module.scss'
import { ProjectBlockData } from '../EditableProjectBlock/EditableProjectBlock'
import { useState, useEffect } from 'react'
import {
  FaPen,
  FaGripVertical,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa'

interface DraggableProjectBlockProps {
  data: ProjectBlockData
  onBlockSelect: (id: string) => void
}

export const DraggableProjectBlock: React.FC<DraggableProjectBlockProps> = ({
  data,
  onBlockSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleToggle = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setIsExpanded((prev) => !prev)
    setTimeout(() => setIsTransitioning(false), 400)
  }

  // TODO: add drag and drop functionality with dnd-kit

  return (
    <div
      className={[styles.draggableProjectBlockContainer, 'prevent-select'].join(
        ' '
      )}
    >
      <div className={styles.draggableProjectBlock}>
        <div className={styles.projectBlockContent}>
          <h3 className={styles.projectBlockHeader}>{data.title}</h3>
          <p className={styles.projectBlockDate}>
            {`${data.startDate.month} ${data.startDate.year} -
            ${
              data.endDate.isPresent
                ? 'Present'
                : `${data.endDate.month} ${data.endDate.year}`
            }`}
          </p>
        </div>

        <div className={styles.projectBlockActions}>
          <button
            type='button'
            className={styles.editButton}
            onClick={() => onBlockSelect(data.id)}
          >
            <FaPen />
          </button>
          <div className={styles.projectBlockDraggableArea}>
            <FaGripVertical />
          </div>
        </div>
      </div>

      {data.bulletPoints.length > 0 && (
        <button className={styles.drawerToggleButton} onClick={handleToggle}>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      )}

      <div
        className={`${styles.projectBlockDrawer} ${
          isExpanded ? styles.expanded : ''
        }`}
      >
        {data.bulletPoints.map((bullet, index) => (
          <p key={index} className={styles.projectBlockBullet}>
            {bullet}
          </p>
        ))}
      </div>
    </div>
  )
}
