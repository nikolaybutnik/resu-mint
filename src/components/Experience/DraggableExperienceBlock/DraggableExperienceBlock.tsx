import styles from './DraggableExperienceBlock.module.scss'
import { useState } from 'react'
import { FaChevronDown, FaChevronUp, FaPen } from 'react-icons/fa'
import { ExperienceBlockData } from '@/lib/types/experience'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DraggableExperienceBlockProps {
  data: ExperienceBlockData
  onBlockSelect: (id: string) => void
  isOverlay?: boolean
  isDropping?: boolean
}

export const DraggableExperienceBlock: React.FC<
  DraggableExperienceBlockProps
> = ({ data, onBlockSelect, isOverlay = false, isDropping = false }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: data.id, disabled: isOverlay })

  const style = isOverlay
    ? { zIndex: 100 }
    : {
        transform: CSS.Translate.toString(transform),
        transition: isDropping || isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0 : 1,
      }

  const handleToggle = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setIsExpanded((prev) => !prev)
    setTimeout(() => setIsTransitioning(false), 400)
  }

  return (
    <div
      ref={isOverlay ? null : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={[
        styles.draggableExperienceBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
      ].join(' ')}
    >
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
            data-no-dnd='true'
            className={styles.editButton}
            onClick={() => onBlockSelect(data.id)}
            disabled={isDragging || isOverlay}
          >
            <FaPen />
          </button>
        </div>
      </div>

      {data.bulletPoints.length > 0 && (
        <button className={styles.drawerToggleButton} onClick={handleToggle}>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      )}

      {data.bulletPoints.length > 0 && (
        <div
          className={`${styles.experienceBlockDrawer} ${
            isExpanded ? styles.expanded : ''
          }`}
        >
          {data.bulletPoints.map((bullet, index) => (
            <p key={index} className={styles.experienceBlockBullet}>
              {bullet.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
