import styles from './DraggableEducationBlock.module.scss'
import React, { useCallback } from 'react'
import { FaPen, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DegreeStatus, EducationBlockData } from '@/lib/types/education'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { useEducationStore } from '@/stores'

interface DraggableEducationBlockProps {
  data: EducationBlockData
  isOverlay?: boolean
  isDropping?: boolean
  onSectionEdit: (id: string) => void
}

const DraggableEducationBlock: React.FC<DraggableEducationBlockProps> =
  React.memo(
    ({ data, isOverlay = false, isDropping = false, onSectionEdit }) => {
      const { data: educationData, save } = useEducationStore()

      const { attributes, listeners, setNodeRef, transform, isDragging } =
        useSortable({
          id: data.id,
          disabled: isOverlay,
        })

      const style = isOverlay
        ? { zIndex: 100 }
        : {
            transform: CSS.Translate.toString(transform),
            transition:
              isDropping || isDragging ? 'none' : 'transform 0.2s ease',
            zIndex: isDragging ? 10 : 1,
            opacity: isDragging ? 0.5 : 1,
            touchAction: isDragging ? 'none' : 'manipulation',
          }

      const handleSectionInclusionToggle = useCallback(() => {
        const updatedSection = { ...data, isIncluded: !data.isIncluded }
        const updatedData = educationData.map((section) =>
          section.id === data.id ? updatedSection : section
        )
        save(updatedData)
      }, [data, educationData, save])

      const formatDatesWithStatus = () => {
        const { startDate, endDate, degreeStatus } = data

        const formatDate = (
          date: { month?: string; year: string } | undefined
        ) => {
          if (!date || !date.year) return ''
          return date.month ? `${date.month} ${date.year}` : date.year
        }

        const startStr = formatDate(startDate)
        const endStr = formatDate(endDate)

        let dateStr = ''
        if (startStr && endStr) {
          dateStr = `${startStr} - ${endStr}`
        } else if (startStr) {
          dateStr = startStr
        } else if (endStr) {
          dateStr = endStr
        }

        const statusText =
          degreeStatus === DegreeStatus.COMPLETED
            ? 'Completed'
            : degreeStatus === DegreeStatus.IN_PROGRESS
            ? 'In Progress'
            : ''

        if (dateStr && statusText) {
          return `${dateStr} (${statusText})`
        } else if (dateStr) {
          return dateStr
        } else if (statusText) {
          return statusText
        }

        return null
      }

      return (
        <div
          ref={isOverlay ? null : setNodeRef}
          style={style}
          {...(isOverlay ? {} : { ...attributes, ...listeners })}
          className={[
            styles.draggableEducationBlockContainer,
            'prevent-select',
            isDragging || isOverlay ? styles.isDragging : '',
            !data.isIncluded ? styles.excluded : '',
          ].join(' ')}
        >
          <LongPressHandler
            className={styles.draggableEducationBlock}
            disabled={false}
            title='Long press to drag and reorder'
          >
            <div className={styles.educationBlockContent}>
              <h3 className={styles.educationBlockHeader}>
                {data.institution}
              </h3>
              {!data.isIncluded && (
                <p className={styles.educationBlockExcluded}>
                  This education is not currently included in your resume
                </p>
              )}
              <p className={styles.educationBlockDegree}>{data.degree}</p>
              {data.location && (
                <p className={styles.educationBlockLocation}>{data.location}</p>
              )}
              {formatDatesWithStatus() && (
                <p className={styles.educationBlockDate}>
                  {formatDatesWithStatus()}
                </p>
              )}
            </div>

            <div className={styles.educationBlockActions}>
              <button
                type='button'
                data-no-dnd='true'
                className={styles.editButton}
                onClick={() => onSectionEdit(data.id)}
                disabled={isDragging || isOverlay}
              >
                <FaPen size={14} />
              </button>
              <button
                type='button'
                data-no-dnd='true'
                className={[
                  styles.toggleIncludeButton,
                  data.isIncluded ? styles.included : styles.excluded,
                ].join(' ')}
                onClick={handleSectionInclusionToggle}
                disabled={isDragging || isOverlay}
                title={
                  data.isIncluded ? 'Exclude from resume' : 'Include in resume'
                }
              >
                {data.isIncluded ? (
                  <FaEye size={14} />
                ) : (
                  <FaEyeSlash size={14} />
                )}
              </button>
            </div>
          </LongPressHandler>
        </div>
      )
    }
  )

DraggableEducationBlock.displayName = 'DraggableEducationBlock'

export default DraggableEducationBlock
