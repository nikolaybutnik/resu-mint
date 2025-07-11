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
import Portal from '@/components/shared/Portal/Portal'
import { KeywordUtils } from '@/lib/keywordUtils'
import { KeywordData } from '@/lib/types/keywords'
import { useSettingsStore } from '@/stores'
import { BulletPoint as BulletPointType } from '@/lib/types/experience'
import { sanitizeResumeBullet } from '@/lib/utils'
import { VALIDATION_DELAY } from '@/lib/constants'
import { bulletTextValidationSchema } from '@/lib/validationSchemas'
import { zodErrorsToFormErrors } from '@/lib/types/errors'
import { bulletService } from '@/lib/services/bulletService'
import { useJobDetailsStore } from '@/stores'
import { useAiStateStore } from '@/stores/aiStateStore'

interface BulletPointProps {
  sectionId: string
  sectionType: 'experience' | 'project'
  bulletData: BulletPointType
  isDangerousAction?: boolean
  keywordData: KeywordData | null
  onBulletCancel: () => void
}

const BulletPoint: React.FC<BulletPointProps> = ({
  sectionId,
  sectionType,
  bulletData,
  isDangerousAction = false,
  keywordData, // TODO: work into Zustand store
  onBulletCancel,
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
  const [editMode, setEditMode] = useState(false)
  const [editModeText, setEditModeText] = useState('')
  const [errors, setErrors] = useState<{
    emptyBullet?: string
    bulletTooLong?: string
  }>({})

  const { data: settings } = useSettingsStore()
  const { data: jobDetails } = useJobDetailsStore()
  const { bulletIdsGenerating, setBulletIdsGenerating } = useAiStateStore()

  const isCurrentBulletRegenerating = bulletIdsGenerating.includes(
    bulletData.id
  )
  const isAnyBulletRegenerating = bulletIdsGenerating.length > 0

  useEffect(() => {
    if (bulletData.isTemporary) {
      setEditMode(true)
    }
  }, [bulletData.isTemporary])

  useEffect(() => {
    if (isCurrentBulletRegenerating) {
      setIsFadingOut(true)
    } else {
      setIsFadingOut(false)
      setIsFadingIn(true)
      const timeout = setTimeout(() => setIsFadingIn(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [isCurrentBulletRegenerating])

  useEffect(() => {
    if (editMode && editInputRef.current) {
      editInputRef.current.focus()
      const textLength = editInputRef.current.value.length
      editInputRef.current.setSelectionRange(textLength, textLength)
    }
  }, [editMode])

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
      if (editModeText.trim() !== '') {
        handleBulletSave()
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.stopPropagation()
    } else if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      handleBulletEditCancel()
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
        handleBulletDelete()
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
        handleBulletRegenerate()
        setActivePopup(null)
      },
    },
  }

  const validateBulletText = (text: string) => {
    if (!editMode) return {}

    const result = bulletTextValidationSchema.safeParse({
      text,
      maxCharsPerBullet: settings.maxCharsPerBullet,
    })

    if (result.success) {
      setErrors({})
      return
    }

    setErrors(zodErrorsToFormErrors(result.error))
  }

  const handleBulletEdit = (): void => {
    setEditMode(true)
    setEditModeText(bulletData.text)
  }

  const handleBulletEditCancel = (): void => {
    setEditMode(false)
    setEditModeText('')
    setErrors({})
    onBulletCancel()
  }

  useEffect(() => {
    if (bulletData.isLocked && editMode) {
      setEditMode(false)
      setEditModeText('')
      setErrors({})
    }
  }, [bulletData.isLocked, editMode])

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    if (!editMode) return

    const sanitized = sanitizeResumeBullet(e.target.value, false)
    setEditModeText(sanitized)

    setTimeout(() => validateBulletText(sanitized), VALIDATION_DELAY)
  }

  const handleBulletSave = async (): Promise<void> => {
    const updatedBulletData = {
      ...bulletData,
      text: editModeText,
      isLocked: bulletData.isLocked ?? false,
    }

    await bulletService.saveBullet(
      updatedBulletData,
      sectionId,
      sectionType,
      settings.maxCharsPerBullet
    )

    if (bulletData.isTemporary) {
      onBulletCancel()
    }

    setEditMode(false)
    setEditModeText('')
    setErrors({})
  }

  const handleBulletDelete = async (): Promise<void> => {
    await bulletService.deleteBullet(sectionId, sectionType, bulletData.id)
  }

  const handleBulletLockToggle = async (): Promise<void> => {
    await bulletService.toggleBulletLock(sectionId, sectionType, bulletData.id)
  }

  const handleBulletRegenerate = async (): Promise<void> => {
    try {
      const bulletToGenerate = editMode
        ? { ...bulletData, text: editModeText }
        : bulletData

      setBulletIdsGenerating([bulletToGenerate.id])

      const result: {
        sectionId: string
        bullets: BulletPointType[]
      } | null = await bulletService.generateBulletsForSection(
        sectionId,
        sectionType,
        [bulletToGenerate],
        jobDetails.analysis,
        settings
      )

      if (result && result.bullets.length > 0) {
        const generatedBullet = result.bullets.find(
          (bullet) => bullet.id === bulletToGenerate.id
        )
        if (editMode && generatedBullet) {
          setEditModeText(generatedBullet.text)
        } else if (!editMode && generatedBullet) {
          await bulletService.saveBullet(
            generatedBullet,
            sectionId,
            sectionType,
            settings.maxCharsPerBullet
          )
        }
      }
    } catch (error) {
      console.error('Error regenerating bullet:', error)
    } finally {
      setBulletIdsGenerating([])
    }
  }

  return (
    <div
      className={[
        styles.bulletContainer,
        isCurrentBulletRegenerating ? styles.regenerating : '',
      ].join(' ')}
      ref={bulletContainerRef}
    >
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.deleteButton}
            onClick={() => setActivePopup('delete')}
            disabled={
              editMode ||
              isCurrentBulletRegenerating ||
              isAnyBulletRegenerating ||
              bulletData.isLocked
            }
            title='Delete bullet'
            data-no-dnd='true'
          >
            <FaTrash size={12} />
          </button>
        </div>
        <div className={styles.toolbarRight}>
          {editMode ? (
            <>
              <button
                className={styles.saveButton}
                onClick={handleBulletSave}
                disabled={
                  editModeText.trim() === '' ||
                  isCurrentBulletRegenerating ||
                  isAnyBulletRegenerating
                }
                title='Save (Enter)'
                data-no-dnd='true'
              >
                <FaCheck size={12} />
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleBulletEditCancel}
                disabled={
                  isCurrentBulletRegenerating || isAnyBulletRegenerating
                }
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
                onClick={handleBulletEdit}
                disabled={
                  isCurrentBulletRegenerating ||
                  isAnyBulletRegenerating ||
                  bulletData.isLocked
                }
                title='Edit bullet'
                data-no-dnd='true'
              >
                <FaPencilAlt size={12} />
              </button>
            </>
          )}
          {!bulletData.isTemporary && (
            <button
              className={[
                styles.lockButton,
                bulletData.isLocked ? styles.locked : styles.unlocked,
              ].join(' ')}
              onClick={handleBulletLockToggle}
              disabled={isCurrentBulletRegenerating || isAnyBulletRegenerating}
              title='Lock bullet'
              data-no-dnd='true'
            >
              {bulletData.isLocked ? (
                <FaLock size={12} />
              ) : (
                <FaUnlock size={12} />
              )}
            </button>
          )}
          <button
            className={styles.regenerateButton}
            onClick={
              editMode
                ? () => handleBulletRegenerate()
                : () => setActivePopup('regenerate')
            }
            disabled={
              isCurrentBulletRegenerating ||
              isAnyBulletRegenerating ||
              bulletData.isLocked
            }
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

      {editMode ? (
        <div className={styles.bulletInputAreaWrapper}>
          <textarea
            ref={editInputRef}
            className={styles.bulletInputArea}
            value={editModeText}
            disabled={isCurrentBulletRegenerating}
            onChange={handleTextareaChange}
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
                editModeText.length > settings.maxCharsPerBullet * 0.9
                  ? editModeText.length > settings.maxCharsPerBullet
                    ? styles.characterCountExceeded
                    : styles.characterCountWarning
                  : '',
              ].join(' ')}
            >
              {`${editModeText.length}/${settings.maxCharsPerBullet} (max 500)`}
            </span>
            {errors.emptyBullet && (
              <p className={styles.formError}>{errors.emptyBullet}</p>
            )}
            {errors.bulletTooLong && (
              <p className={[styles.formError, styles.flashWarning].join(' ')}>
                {errors.bulletTooLong}
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
              {keywordData && keywordData.usageStats.length > 0
                ? KeywordUtils.highlightKeywords(
                    bulletData.text,
                    keywordData.usageStats.map((stat) => stat.keyword),
                    styles.keywordHighlight
                  )
                : bulletData.text}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(BulletPoint, (prevProps, nextProps) => {
  return (
    prevProps.sectionId === nextProps.sectionId &&
    prevProps.sectionType === nextProps.sectionType &&
    prevProps.isDangerousAction === nextProps.isDangerousAction &&
    prevProps.bulletData.id === nextProps.bulletData.id &&
    prevProps.bulletData.text === nextProps.bulletData.text &&
    prevProps.bulletData.isLocked === nextProps.bulletData.isLocked &&
    prevProps.bulletData.isTemporary === nextProps.bulletData.isTemporary &&
    prevProps.keywordData === nextProps.keywordData
  )
})
