import styles from './BulletPoint.module.scss'
import { FaPencilAlt } from 'react-icons/fa'
import { FaRedo, FaTimes, FaTrash } from 'react-icons/fa'
import { FaCheck } from 'react-icons/fa'
import { memo, useEffect, useRef, useState } from 'react'
import { AppSettings } from '@/lib/types/settings'

interface BulletPointProps {
  sectionId: string
  text: string
  editingText: string
  index: number
  isRegenerating: boolean
  isEditing: boolean
  disableAllControls: boolean
  errors: {
    bulletEmpty?: string[]
    bulletTooLong?: string[]
  }
  settings: AppSettings
  onCancelEdit: () => void
  onBulletDelete: (index: number) => void
  onBulletSave: () => void
  onEditBullet: (index: number, e: React.MouseEvent) => void
  onRegenerateBullet: (
    sectionId: string,
    index: number,
    isEditing?: boolean
  ) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

const BulletPoint: React.FC<BulletPointProps> = ({
  sectionId,
  text,
  editingText,
  index,
  isRegenerating,
  isEditing,
  disableAllControls,
  errors,
  settings,
  onCancelEdit,
  onBulletDelete,
  onBulletSave,
  onEditBullet,
  onRegenerateBullet,
  onTextareaChange,
}) => {
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const [deleteExpanded, setDeleteExpanded] = useState<boolean>(false)

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      onBulletSave()
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.stopPropagation()
    } else if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancelEdit()
    }
  }

  return (
    <div
      className={[
        styles.bulletContainer,
        isRegenerating ? styles.regenerating : '',
      ].join(' ')}
    >
      <div className={styles.bulletDeleteWrapper}>
        <div
          className={[
            styles.bulletDeleteContainer,
            deleteExpanded ? styles.expanded : '',
            disableAllControls || isEditing ? styles.deleteDisabled : '',
          ].join(' ')}
          onTouchStart={(e) => {
            if (!deleteExpanded && !isEditing) {
              setTimeout(() => setDeleteExpanded(true), 200)
              e.stopPropagation()
            }
          }}
          onMouseEnter={() => {
            if (!deleteExpanded && !isEditing) {
              setDeleteExpanded(true)
            }
          }}
          onMouseLeave={() => {
            setDeleteExpanded(false)
          }}
        >
          <button
            className={styles.bulletDeleteButton}
            onClick={() => {
              onBulletDelete(index)
              setDeleteExpanded(false)
            }}
            disabled={!deleteExpanded || disableAllControls}
            tabIndex={deleteExpanded ? 0 : -1}
          >
            <FaTrash />
          </button>
        </div>
      </div>
      {isEditing ? (
        <div className={styles.bulletInputAreaWrapper}>
          <textarea
            ref={editInputRef}
            className={styles.bulletInputArea}
            value={editingText}
            disabled={isRegenerating}
            onChange={onTextareaChange}
            onKeyDown={handleKeyDown}
            data-no-dnd='true'
            rows={4}
            maxLength={500}
            autoFocus
          />
          <div className={styles.characterCount}>
            <span
              className={
                editingText.length > settings.maxCharsPerBullet * 0.9
                  ? editingText.length > settings.maxCharsPerBullet
                    ? styles.characterCountExceeded
                    : styles.characterCountWarning
                  : ''
              }
            >
              {`${editingText.length}/${settings.maxCharsPerBullet} (max 500)`}
            </span>
          </div>
          {errors.bulletEmpty && (
            <p className={styles.formError}>{errors.bulletEmpty}</p>
          )}
          {errors.bulletTooLong && (
            <p className={`${styles.formError} ${styles.flashWarning}`}>
              {errors.bulletTooLong}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.bulletText}>{text}</p>
      )}
      {isEditing ? (
        <div className={styles.editBulletButtonContainer}>
          <button
            className={styles.saveButton}
            onClick={onBulletSave}
            data-no-dnd='true'
            disabled={
              editingText.trim() === '' || isRegenerating || disableAllControls
            }
            title='Save (Enter)'
          >
            <FaCheck size={12} />
          </button>
          <button
            className={styles.cancelButton}
            onClick={onCancelEdit}
            disabled={isRegenerating || disableAllControls}
            data-no-dnd='true'
            title='Cancel (Esc)'
          >
            <FaTimes size={12} />
          </button>
          <button
            className={styles.regenerateButton}
            disabled={isRegenerating || disableAllControls}
            onClick={() => onRegenerateBullet(sectionId, index, true)}
            data-no-dnd='true'
          >
            <FaRedo size={12} />
          </button>
        </div>
      ) : (
        <div className={styles.viewBulletButtonContainer}>
          <button
            className={styles.editButton}
            disabled={isRegenerating || disableAllControls}
            onClick={(e) => onEditBullet(index, e)}
            data-no-dnd='true'
          >
            <FaPencilAlt size={12} />
          </button>
          <button
            className={styles.regenerateButton}
            disabled={isRegenerating || disableAllControls}
            onClick={() => onRegenerateBullet(sectionId, index)}
            data-no-dnd='true'
          >
            <FaRedo size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(BulletPoint)
