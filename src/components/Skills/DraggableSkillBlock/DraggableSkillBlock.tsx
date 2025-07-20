import { useSortable } from '@dnd-kit/sortable'
import styles from './DraggableSkillBlock.module.scss'
import { useMemo } from 'react'
import { CSS } from '@dnd-kit/utilities'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'

interface DraggableSkillBlockProps {
  id: string
  title: string
  skills: string[]
  isOverlay: boolean
  isDropping: boolean
}

const DraggableSkillBlock = ({
  id,
  title,
  skills,
  isOverlay = false,
  isDropping = false,
}: DraggableSkillBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id,
      disabled: isOverlay,
    })

  const style = useMemo(
    () =>
      isOverlay
        ? { zIndex: 100 }
        : {
            transform: CSS.Translate.toString(transform),
            transition:
              isDropping || isDragging ? 'none' : 'transform 0.2s ease',
            zIndex: isDragging ? 10 : 1,
            opacity: isDragging ? 0.5 : 1,
            touchAction: isDragging ? 'none' : 'manipulation',
          },
    [isOverlay, transform, isDropping, isDragging]
  )

  return (
    <div
      className={[
        styles.draggableSkillBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
      ].join(' ')}
      ref={isOverlay ? null : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
    >
      <LongPressHandler
        className={styles.draggableProjectBlock}
        disabled={isOverlay}
        title='Long press to drag and reorder'
      >
        <h3 className={styles.blockTitle}>{title}</h3>
        <div className={styles.skillsContainer}>
          {skills.map((skill) => (
            <div key={skill} className={styles.skill}>
              {skill}
            </div>
          ))}
        </div>
      </LongPressHandler>
    </div>
  )
}

export default DraggableSkillBlock
