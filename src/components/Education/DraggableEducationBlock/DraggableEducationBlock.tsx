import styles from './DraggableEducationBlock.module.scss'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPen, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DegreeStatus, EducationBlockData } from '@/lib/types/education'

interface DraggableEducationBlockProps {
  data: EducationBlockData
  isOverlay?: boolean
  isDropping?: boolean
  onBlockSelect: (id: string) => void
  onToggleInclude: (sectionId: string, isIncluded: boolean) => void
}

const DraggableEducationBlock: React.FC<DraggableEducationBlockProps> = ({
  data,
  isOverlay = false,
  isDropping = false,
  onBlockSelect,
  onToggleInclude,
}) => {
  const [localData, setLocalData] = useState<EducationBlockData>(data)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: data.id,
      disabled: isOverlay,
    })

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const style = isOverlay
    ? { zIndex: 100 }
    : {
        transform: CSS.Translate.toString(transform),
        transition: isDropping || isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0 : 1,
      }

  const handleToggleInclude = useCallback(() => {
    const updatedData = { ...localData, isIncluded: !localData.isIncluded }
    setLocalData(updatedData)
    onToggleInclude(data.id, updatedData.isIncluded)
  }, [data.id, localData, onToggleInclude])

  const formatDatesWithStatus = () => {
    const { startDate, endDate, degreeStatus } = data

    const formatDate = (date: { month?: string; year: string } | undefined) => {
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
        !localData.isIncluded ? styles.excluded : '',
      ].join(' ')}
    >
      <div className={styles.draggableEducationBlock}>
        <div className={styles.educationBlockContent}>
          <h3 className={styles.educationBlockHeader}>{data.institution}</h3>
          {!localData.isIncluded && (
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
            onClick={() => onBlockSelect(data.id)}
            disabled={isDragging || isOverlay}
          >
            <FaPen size={14} />
          </button>
          <button
            type='button'
            data-no-dnd='true'
            className={[
              styles.toggleIncludeButton,
              localData.isIncluded ? styles.included : styles.excluded,
            ].join(' ')}
            onClick={handleToggleInclude}
            disabled={isDragging || isOverlay}
            title={
              localData.isIncluded ? 'Exclude from resume' : 'Include in resume'
            }
          >
            {localData.isIncluded ? (
              <FaEye size={14} />
            ) : (
              <FaEyeSlash size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DraggableEducationBlock
