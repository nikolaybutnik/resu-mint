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
import { confirm } from '@/stores'
import { toast } from '@/stores/toastStore'
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
import { SectionType } from '@/lib/types/api'

interface BulletPointProps {
  sectionId: string
  sectionType: SectionType
  bulletData: BulletPointType
  keywordData: KeywordData | null
  onBulletCancel: () => void
}

const BulletPoint: React.FC<BulletPointProps> = ({
  sectionId,
  sectionType,
  bulletData,
  keywordData, // TODO: work into Zustand store
  onBulletCancel,
}) => {
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const bulletContainerRef = useRef<HTMLDivElement>(null)

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

  const onDeleteClick = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Delete this bullet?',
      message: "This can't be undone.",
      confirmText: 'Delete',
      cancelText: 'Cancel',
      anchorEl: bulletContainerRef.current,
      placement: 'left',
      width: 240,
    })
    if (ok) {
      await handleBulletDelete()
    }
  }

  const onRegenerateClick = async (): Promise<void> => {
    if (editMode) {
      await handleBulletRegenerate()
      return
    }
    const ok = await confirm({
      title: 'Regenerate this bullet?',
      message: "This can't be undone.",
      confirmText: 'Regenerate',
      cancelText: 'Cancel',
      anchorEl: bulletContainerRef.current,
      placement: 'right',
      width: 240,
    })
    if (ok) {
      await handleBulletRegenerate()
    }
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

    const result = await bulletService.saveBullet(
      updatedBulletData,
      sectionId,
      sectionType,
      settings.maxCharsPerBullet
    )

    if (!result.success) {
      console.error('Failed to save bullet:', result.error)

      toast.error('Failed to save the bullet point.')
      return
    }

    if (bulletData.isTemporary) {
      onBulletCancel()
    }

    setEditMode(false)
    setEditModeText('')
    setErrors({})
  }

  const handleBulletDelete = async (): Promise<void> => {
    const result = await bulletService.deleteBullet(
      sectionId,
      sectionType,
      bulletData.id
    )
    if (!result.success) {
      console.error('Failed to delete bullet:', result.error)

      toast.error('Failed to delete the bullet point.')
    }
  }

  const handleBulletLockToggle = async (): Promise<void> => {
    const result = await bulletService.toggleBulletLock(
      sectionId,
      sectionType,
      bulletData.id
    )
    if (!result.success) {
      console.error('Failed to toggle bullet lock:', result.error)

      toast.error('Failed to toggle bullet lock.')
    }
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
          const saveResult = await bulletService.saveBullet(
            generatedBullet,
            sectionId,
            sectionType,
            settings.maxCharsPerBullet
          )
          if (!saveResult.success) {
            console.error('Failed to save generated bullet:', saveResult.error)

            toast.error('Failed to save bullet point.')
          }
        }
      }
    } catch (error) {
      console.error('Error regenerating bullet:', error)

      if (error instanceof Error && error.message === 'INSUFFICIENT_CONTEXT') {
        toast.info(
          'The AI needs more context to generate this bullet. Add more details to your experience or project description.'
        )
        return
      }

      toast.error('Failed to generate the bullet point.')
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
            onClick={onDeleteClick}
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
            onClick={onRegenerateClick}
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
    prevProps.bulletData.id === nextProps.bulletData.id &&
    prevProps.bulletData.text === nextProps.bulletData.text &&
    prevProps.bulletData.isLocked === nextProps.bulletData.isLocked &&
    prevProps.bulletData.isTemporary === nextProps.bulletData.isTemporary &&
    prevProps.keywordData === nextProps.keywordData
  )
})
