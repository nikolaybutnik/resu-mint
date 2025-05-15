import styles from './DraggableProjectBlock.module.scss'
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
import { ROUTES } from '@/lib/constants'
import { JobDescriptionAnalysis } from '@/lib/types/api'
import { ProjectBlockData } from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'

interface DraggableProjectBlockProps {
  data: ProjectBlockData
  jobDescriptionAnalysis: JobDescriptionAnalysis
  onBlockSelect: (id: string) => void
  onEditBullets: (updatedBlock: ProjectBlockData) => void
  settings: AppSettings
  isOverlay?: boolean
  isDropping?: boolean
}

export const DraggableProjectBlock: React.FC<DraggableProjectBlockProps> = ({
  data,
  jobDescriptionAnalysis,
  onBlockSelect,
  settings,
  isOverlay = false,
  isDropping = false,
  onEditBullets,
}) => {
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(
    null
  )
  const [editingBulletText, setEditingBulletText] = useState('')
  const [deleteExpanded, setDeleteExpanded] = useState<null | number>(null)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(
    null
  )

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
    onEditBullets(data)
  }

  const handleRegenerateBullet = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      setRegeneratingIndex(index)

      const bulletToRegenerate = data.bulletPoints[index]
      const existingBullets = data.bulletPoints.filter(
        (bullet) => bullet.id !== bulletToRegenerate.id
      )

      const payload = {
        section: {
          type: 'project',
          description: data.description,
        },
        existingBullets,
        jobDescriptionAnalysis,
        numBullets: 1,
        maxCharsPerBullet: settings.maxCharsPerBullet,
      }

      const response = await fetch(ROUTES.GENERATE_BULLETS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
      }

      const result = await response.json()
      if (result.status !== 'success' || !result.data || result.errors) {
        console.error('Failed to generate bullets', result.errors)
      }

      const newBullet = {
        id: bulletToRegenerate.id,
        text: result.data[0],
      }
      const updatedBullets = data.bulletPoints.map((bullet) =>
        bullet.id === bulletToRegenerate.id ? newBullet : bullet
      )

      const updatedData = {
        ...data,
        bulletPoints: updatedBullets,
      }
      onEditBullets(updatedData)
    } catch (error) {
      console.error('Error regenerating bullet', error)
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const handleEditBullet = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingBulletIndex(index)
    setEditingBulletText(data.bulletPoints[index].text)
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
          idx === editingBulletIndex
            ? { ...bullet, text: editingBulletText }
            : bullet
        ),
      }
      onEditBullets(updatedData)
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
    onEditBullets(updatedData)
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
          <div
            key={index}
            className={[
              styles.bulletContainer,
              regeneratingIndex === index ? styles.regenerating : '',
            ].join(' ')}
          >
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
                    setDeleteExpanded(index)
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
              <p className={styles.bulletText}>{bullet.text}</p>
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
