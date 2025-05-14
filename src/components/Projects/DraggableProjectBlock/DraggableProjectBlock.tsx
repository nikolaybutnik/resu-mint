import styles from './DraggableProjectBlock.module.scss'
import { ProjectBlockData } from '../EditableProjectBlock/EditableProjectBlock'
import { useEffect, useRef, useState } from 'react'
import {
  FaPen,
  FaChevronDown,
  FaChevronUp,
  FaMagic,
  FaRedo,
  FaPencilAlt,
  FaCheck,
  FaTimes,
  FaTrash,
} from 'react-icons/fa'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DraggableProjectBlockProps {
  data: ProjectBlockData
  onBlockSelect: (id: string) => void
  onEditBullet: (updatedBlock: ProjectBlockData) => void
  onDeleteBullet: (updatedBlock: ProjectBlockData) => void
  isOverlay?: boolean
  isDropping?: boolean
  onGenerateAllBullets?: (sectionId: string) => void
  onRegenerateBullet?: (sectionId: string, index: number) => void
}

export const DraggableProjectBlock: React.FC<DraggableProjectBlockProps> = ({
  data,
  onBlockSelect,
  isOverlay = false,
  isDropping = false,
  onGenerateAllBullets,
  onEditBullet,
  onDeleteBullet,
  onRegenerateBullet,
}) => {
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const deleteRevealRef = useRef<HTMLDivElement>(null)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(
    null
  )
  const [editingBulletText, setEditingBulletText] = useState('')
  const [deleteExpanded, setDeleteExpanded] = useState<null | number>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: data.id,
      disabled: isOverlay,
    })

  useEffect(() => {
    if (editingBulletIndex !== null && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingBulletIndex])

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

  const handleGenerateAllBullets = (e: React.MouseEvent) => {
    // TODO: implement
    e.stopPropagation()
    onGenerateAllBullets?.(data.id)
  }

  const handleRegenerateBullet = (index: number, e: React.MouseEvent) => {
    // TODO: implement
    e.stopPropagation()
    onRegenerateBullet?.(data.id, index)
  }

  const handleEditBullet = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingBulletIndex(index)
    setEditingBulletText(data.bulletPoints[index])
  }

  const handleCancelEdit = () => {
    setEditingBulletIndex(null)
    setEditingBulletText('')
  }

  const handleSaveBullet = () => {
    if (editingBulletIndex !== null) {
      const updatedData = {
        ...data,
        bulletPoints: data.bulletPoints.map((bullet, idx) =>
          idx === editingBulletIndex ? editingBulletText : bullet
        ),
      }
      onEditBullet(updatedData)
      setEditingBulletIndex(null)
    }
  }

  // TODO: implement confirmation modal
  const handleDeleteBullet = (index: number) => {
    const updatedData = {
      ...data,
      bulletPoints: data.bulletPoints.filter(
        (_bullet, bulletIndex) => bulletIndex !== index
      ),
    }
    onDeleteBullet(updatedData)
    setDeleteExpanded(null)
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    bulletIndex: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      handleSaveBullet()
      console.log(bulletIndex)
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.stopPropagation()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      handleCancelEdit()
    }
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
            {`${data.startDate.month} ${data.startDate.year} - ${
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
            className={styles.generateAllButton}
            onClick={handleGenerateAllBullets}
            disabled={isDragging || isOverlay}
          >
            <FaMagic size={12} />
            <span>Generate</span>
          </button>
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
        <button
          className={`${styles.drawerToggleButton} ${
            isExpanded ? styles.noRadius : ''
          }`}
          onClick={handleToggle}
        >
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      )}

      <div
        data-no-dnd='true'
        className={`${styles.projectBlockDrawer} ${
          isExpanded ? styles.expanded : ''
        }`}
      >
        {data.bulletPoints.map((bullet, index) => (
          <div key={index} className={styles.bulletContainer}>
            <div className={styles.bulletDeleteWrapper}>
              <div
                className={[
                  styles.bulletDeleteContainer,
                  deleteExpanded === index ? styles.expanded : '',
                ].join(' ')}
                onTouchStart={(e) => {
                  if (deleteExpanded !== index) {
                    setTimeout(() => setDeleteExpanded(index), 200)
                    e.stopPropagation()
                  }
                }}
                onMouseEnter={() => {
                  if (deleteExpanded !== index) {
                    setTimeout(() => setDeleteExpanded(index), 200)
                  }
                }}
                onMouseLeave={() => {
                  setDeleteExpanded(null)
                }}
              >
                <button
                  className={styles.bulletDeleteButton}
                  onClick={() => handleDeleteBullet(index)}
                  disabled={deleteExpanded !== index}
                  tabIndex={deleteExpanded === index ? 0 : -1}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            {editingBulletIndex === index ? (
              <textarea
                ref={editInputRef}
                className={styles.bulletInputArea}
                value={editingBulletText}
                onChange={(e) => setEditingBulletText(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                data-no-dnd='true'
                rows={4}
                autoFocus
              />
            ) : (
              <p className={styles.bulletText}>{bullet}</p>
            )}
            <div className={styles.bulletButtons}>
              {editingBulletIndex === index ? (
                <>
                  <button
                    className={styles.saveButton}
                    onClick={handleSaveBullet}
                    data-no-dnd='true'
                    title='Save (Enter)'
                  >
                    <FaCheck size={12} />
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={handleCancelEdit}
                    data-no-dnd='true'
                    title='Cancel (Esc)'
                  >
                    <FaTimes size={12} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={styles.editButton}
                    onClick={(e) => handleEditBullet(index, e)}
                    data-no-dnd='true'
                  >
                    <FaPencilAlt size={12} />
                  </button>
                  <button
                    className={styles.regenerateButton}
                    onClick={(e) => handleRegenerateBullet(index, e)}
                    data-no-dnd='true'
                  >
                    <FaRedo size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
