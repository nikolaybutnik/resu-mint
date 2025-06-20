import styles from './BulletPoint.module.scss'
import {
  FaPencilAlt,
  FaRedo,
  FaTimes,
  FaCheck,
  FaTrash,
  FaLock,
  FaUnlock,
} from 'react-icons/fa'
import { memo, useEffect, useRef, useState } from 'react'
import { AppSettings } from '@/lib/types/settings'
import Portal from '@/components/shared/Portal/Portal'
import { KeywordUtils } from '@/lib/keywordUtils'

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
  isLocked: boolean
  isDangerousAction?: boolean
  keywords?: string[]
  onCancelEdit: () => void
  onBulletDelete: (index: number) => void
  onBulletSave: () => void
  onBulletEdit: (index: number) => void
  onBulletRegenerate: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onLockToggle: (sectionId: string, index: number) => void
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
  isLocked,
  isDangerousAction = false,
  keywords,
  onCancelEdit,
  onBulletDelete,
  onBulletSave,
  onBulletEdit,
  onBulletRegenerate,
  onTextareaChange,
  onLockToggle,
}) => {
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const bulletContainerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const [activePopup, setActivePopup] = useState<
    null | 'delete' | 'regenerate'
  >(null)
  const [popupPosition, setPopupPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [isFadingIn, setIsFadingIn] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    if (isRegenerating) {
      setIsFadingOut(true)
    } else {
      setIsFadingOut(false)
      setIsFadingIn(true)
      const timeout = setTimeout(() => setIsFadingIn(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [isRegenerating])

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    if (isLocked && isEditing) {
      onCancelEdit()
    }
  }, [isLocked, isEditing, onCancelEdit])

  useEffect(() => {
    if (!activePopup || !bulletContainerRef.current) {
      setPopupPosition(null)
      return
    }

    const updatePosition = () => {
      const rect = bulletContainerRef.current!.getBoundingClientRect()
      const scrollY = window.scrollY
      const scrollX = window.scrollX
      const top = rect.top + scrollY
      const left =
        activePopup === 'delete'
          ? rect.left + scrollX
          : rect.right + scrollX - 240 // 240px width of popup
      setPopupPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [activePopup])

  useEffect(() => {
    if (!activePopup) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setActivePopup(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [activePopup])

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

  const popupConfig = {
    delete: {
      message: `Delete this bullet? ${
        isDangerousAction
          ? "This can't be undone."
          : 'Changes will not take effect until the form is saved.'
      }`,
      onConfirm: () => {
        onBulletDelete(index)
        setActivePopup(null)
      },
    },
    regenerate: {
      message: `Regenerate this bullet? ${
        isDangerousAction
          ? "This can't be undone."
          : 'Changes will not take effect until the form is saved.'
      }`,
      onConfirm: () => {
        onBulletRegenerate(sectionId, index)
        setActivePopup(null)
      },
    },
  }

  return (
    <div
      className={[
        styles.bulletContainer,
        isRegenerating ? styles.regenerating : '',
      ].join(' ')}
      ref={bulletContainerRef}
    >
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.deleteButton}
            onClick={() => setActivePopup('delete')}
            disabled={
              isEditing || isRegenerating || disableAllControls || isLocked
            }
            title='Delete bullet'
            data-no-dnd='true'
          >
            <FaTrash size={12} />
          </button>
        </div>
        <div className={styles.toolbarRight}>
          {isEditing ? (
            <>
              <button
                className={styles.saveButton}
                onClick={onBulletSave}
                disabled={
                  editingText.trim() === '' ||
                  isRegenerating ||
                  disableAllControls
                }
                title='Save (Enter)'
                data-no-dnd='true'
              >
                <FaCheck size={12} />
              </button>
              <button
                className={styles.cancelButton}
                onClick={onCancelEdit}
                disabled={isRegenerating || disableAllControls}
                title='Cancel (Esc)'
                data-no-dnd='true'
              >
                <FaTimes size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.editButton}
                onClick={() => onBulletEdit(index)}
                disabled={isRegenerating || disableAllControls || isLocked}
                title='Edit bullet'
                data-no-dnd='true'
              >
                <FaPencilAlt size={12} />
              </button>
            </>
          )}
          <button
            className={[
              styles.lockButton,
              isLocked ? styles.locked : styles.unlocked,
            ].join(' ')}
            onClick={() => onLockToggle(sectionId, index)}
            disabled={isRegenerating || disableAllControls}
            title='Lock bullet'
            data-no-dnd='true'
          >
            {isLocked ? <FaLock size={12} /> : <FaUnlock size={12} />}
          </button>
          <button
            className={styles.regenerateButton}
            onClick={
              isEditing
                ? () => onBulletRegenerate(sectionId, index)
                : () => setActivePopup('regenerate')
            }
            disabled={isRegenerating || disableAllControls || isLocked}
            title='Regenerate bullet'
            data-no-dnd='true'
          >
            <FaRedo size={12} />
          </button>
        </div>
      </div>

      {activePopup && (
        <Portal>
          <div
            className={styles.popupBackdrop}
            onClick={() => setActivePopup(null)}
          />
          {popupPosition && (
            <div
              className={styles.popupWrapper}
              style={{ top: popupPosition.top, left: popupPosition.left }}
            >
              <div
                className={
                  activePopup === 'delete'
                    ? styles.deleteConfirmPopup
                    : styles.regenerateConfirmPopup
                }
                ref={popupRef}
              >
                <div className={styles.popupContent}>
                  <p>{popupConfig[activePopup].message}</p>
                  <div className={styles.popupButtons}>
                    <button
                      className={styles.confirmButton}
                      onClick={popupConfig[activePopup].onConfirm}
                      title={`Confirm ${activePopup}`}
                    >
                      <FaCheck size={12} />
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setActivePopup(null)}
                      title='Cancel'
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Portal>
      )}

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
          <div className={styles.contentFooter}>
            <span
              className={[
                styles.characterCount,
                editingText.length > settings.maxCharsPerBullet * 0.9
                  ? editingText.length > settings.maxCharsPerBullet
                    ? styles.characterCountExceeded
                    : styles.characterCountWarning
                  : '',
              ].join(' ')}
            >
              {`${editingText.length}/${settings.maxCharsPerBullet} (max 500)`}
            </span>
            {(errors.bulletEmpty || errors.bulletTooLong) && (
              <p
                className={[
                  styles.formError,
                  errors.bulletTooLong ? styles.flashWarning : '',
                ].join(' ')}
              >
                {errors.bulletEmpty || errors.bulletTooLong}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.contentArea}>
          <div
            className={[
              styles.bulletText,
              isFadingIn ? styles.fadingIn : '',
              isFadingOut ? styles.fadingOut : '',
            ].join(' ')}
          >
            <p>
              {keywords && keywords.length > 0
                ? KeywordUtils.highlightKeywords(
                    text,
                    keywords,
                    styles.keywordHighlight
                  )
                : text}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(BulletPoint)
