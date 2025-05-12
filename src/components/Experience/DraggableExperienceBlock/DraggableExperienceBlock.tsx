import styles from './DraggableExperienceBlock.module.scss'
import { useState } from 'react'
import { FaChevronDown, FaChevronUp, FaPen } from 'react-icons/fa'
import { ExperienceBlockData } from '../EditableExperienceBlock/EditableExperienceBlock'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DraggableExperienceBlockProps {
  data: ExperienceBlockData
  onBlockSelect: (id: string) => void
}

export const DraggableExperienceBlock: React.FC<
  DraggableExperienceBlockProps
> = ({ data, onBlockSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: data.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  const handleToggle = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setIsExpanded((prev) => !prev)
    setTimeout(() => setIsTransitioning(false), 400)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        styles.draggableExperienceBlockContainer,
        'prevent-select',
        isDragging ? styles.isDragging : '',
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
