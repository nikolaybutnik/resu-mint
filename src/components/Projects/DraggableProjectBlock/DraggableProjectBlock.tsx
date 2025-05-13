import styles from './DraggableProjectBlock.module.scss'
import { ProjectBlockData } from '../EditableProjectBlock/EditableProjectBlock'
import { useState } from 'react'
import { FaPen, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DraggableProjectBlockProps {
  data: ProjectBlockData
  onBlockSelect: (id: string) => void
  isOverlay?: boolean
  isDropping?: boolean
}

export const DraggableProjectBlock: React.FC<DraggableProjectBlockProps> = ({
  data,
  onBlockSelect,
  isOverlay = false,
  isDropping = false,
}) => {
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
        styles.draggableProjectBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
      ].join(' ')}
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
