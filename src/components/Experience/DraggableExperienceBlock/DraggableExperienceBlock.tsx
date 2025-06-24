import styles from './DraggableExperienceBlock.module.scss'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaChevronDown,
  FaChevronUp,
  FaEyeSlash,
  FaEye,
  FaLock,
  FaPen,
  FaPlus,
  FaUnlockAlt,
  FaMagic,
} from 'react-icons/fa'
import { ExperienceBlockData } from '@/lib/types/experience'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BulletPointErrors } from '@/lib/types/errors'
import { AppSettings } from '@/lib/types/settings'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { KeywordData } from '@/lib/types/keywords'

interface DraggableExperienceBlockProps {
  data: ExperienceBlockData
  editingBulletIndex: number | null
  editingBulletText: string
  bulletErrors: BulletPointErrors
  settings: AppSettings
  isRegenerating: boolean
  isAnyBulletBeingEdited: boolean
  isAnyBulletRegenerating: boolean
  isExpanded: boolean
  isOverlay?: boolean
  isDropping?: boolean
  regeneratingBullet?: { section: string; index: number } | null
  keywordData: KeywordData | null
  onBlockSelect: (id: string) => void
  onRegenerateBullet: (
    sectionId: string,
    index: number,
    isExperienceEditForm: boolean
  ) => void
  onRegenerateAllBullets: () => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onDrawerToggle: () => void
  onLockToggle: (sectionId: string, index: number) => void
  onLockToggleAll: (sectionId: string, shouldLock: boolean) => void
  onToggleInclude: (sectionId: string, isIncluded: boolean) => void
}

const DraggableExperienceBlock: React.FC<DraggableExperienceBlockProps> = ({
  data,
  keywordData,
  editingBulletIndex,
  editingBulletText,
  bulletErrors,
  settings,
  isRegenerating,
  regeneratingBullet,
  isAnyBulletBeingEdited,
  isAnyBulletRegenerating,
  isExpanded,
  isOverlay = false,
  isDropping = false,
  onBlockSelect,
  onRegenerateBullet,
  onRegenerateAllBullets,
  onAddBullet,
  onEditBullet,
  onBulletSave,
  onBulletCancel,
  onBulletDelete,
  onTextareaChange,
  onDrawerToggle,
  onLockToggle,
  onLockToggleAll,
  onToggleInclude,
}) => {
  const isFirstRender = useRef(true)
  const touchCleanupRef = useRef<(() => void) | null>(null)

  const [localData, setLocalData] = useState<ExperienceBlockData>(data)
  const [animationKey, setAnimationKey] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [touchFeedback, setTouchFeedback] = useState<{
    x: number
    y: number
    show: boolean
  } | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0
      )
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: data.id,
      disabled: isOverlay || isAnyBulletBeingEdited || isAnyBulletRegenerating,
    })

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isMobile && !isAnyBulletBeingEdited && !isAnyBulletRegenerating) {
        const touch = e.touches[0]
        const rect = e.currentTarget.getBoundingClientRect()

        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top

        setIsLongPressing(true)

        // Wait 150ms before showing animation to differentiate from swipe
        const showAnimationTimer = setTimeout(() => {
          setTouchFeedback({ x, y, show: true })
        }, 150)

        const resetTimer = setTimeout(() => {
          setIsLongPressing(false)
          setTouchFeedback(null)
        }, 850) // 750ms + 100ms buffer

        const cleanup = () => {
          clearTimeout(showAnimationTimer)
          clearTimeout(resetTimer)
        }

        // Store cleanup function in ref
        touchCleanupRef.current = cleanup
      }
    },
    [isMobile, isAnyBulletBeingEdited, isAnyBulletRegenerating]
  )

  const handleTouchEnd = useCallback(() => {
    setIsLongPressing(false)
    setTouchFeedback(null)

    if (touchCleanupRef.current) {
      touchCleanupRef.current()
      touchCleanupRef.current = null
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // If user moves finger too much, cancel the long press
      if (touchFeedback) {
        const touch = e.touches[0]
        const rect = e.currentTarget.getBoundingClientRect()
        const currentX = touch.clientX - rect.left
        const currentY = touch.clientY - rect.top

        const distance = Math.sqrt(
          Math.pow(currentX - touchFeedback.x, 2) +
            Math.pow(currentY - touchFeedback.y, 2)
        )

        // Cancel if moved more than 15px
        if (distance > 15) {
          setIsLongPressing(false)
          setTouchFeedback(null)

          if (touchCleanupRef.current) {
            touchCleanupRef.current()
            touchCleanupRef.current = null
          }
        }
      }
    },
    [touchFeedback]
  )

  useEffect(() => {
    setLocalData(data)
  }, [data])

  // Clear long press state when actual drag starts
  useEffect(() => {
    if (isDragging) {
      setIsLongPressing(false)
      setTouchFeedback(null)
      if (touchCleanupRef.current) {
        touchCleanupRef.current()
        touchCleanupRef.current = null
      }
    }
  }, [isDragging])

  const style = isOverlay
    ? { zIndex: 100 }
    : {
        transform: CSS.Translate.toString(transform),
        transition: isDropping || isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        touchAction: isDragging ? 'none' : 'manipulation',
      }

  const handleToggleInclude = useCallback(() => {
    const updatedData = { ...localData, isIncluded: !localData.isIncluded }
    setLocalData(updatedData)
    onToggleInclude(data.id, updatedData.isIncluded)
  }, [data.id, localData, onToggleInclude])

  const bulletPoints = useMemo(
    () => localData.bulletPoints,
    [localData.bulletPoints]
  )
  const emptyErrors = useMemo(() => ({}), [])

  const isEditingThisSection =
    editingBulletIndex !== null &&
    data.id === (editingBulletText ? data.id : null)
  const isDrawerDisabled =
    (isAnyBulletBeingEdited && !isEditingThisSection) || isAnyBulletRegenerating

  const handleBulletDelete = useCallback(
    (index: number) => onBulletDelete(data.id, index),
    [data.id, onBulletDelete]
  )

  const handleBulletEdit = useCallback(
    (index: number) => onEditBullet(data.id, index),
    [data.id, onEditBullet]
  )

  const handleBulletRegenerate = useCallback(
    (sectionId: string, index: number) =>
      onRegenerateBullet(sectionId, index, false),
    [onRegenerateBullet]
  )

  const handleBulletLockToggle = useCallback(
    (sectionId: string, index: number) => onLockToggle(sectionId, index),
    [onLockToggle]
  )

  // TODO: implemennt
  const handleAllBulletsRegenerate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      isFirstRender.current = false
      setAnimationKey((prev) => prev + 1)
      onRegenerateAllBullets()
    },
    [data, onRegenerateAllBullets]
  )

  return (
    <div
      ref={isOverlay ? null : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={[
        styles.draggableExperienceBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
        !localData.isIncluded ? styles.excluded : '',
      ].join(' ')}
    >
      <div
        className={[
          styles.draggableExperienceBlock,
          isLongPressing ? styles.longPressing : '',
        ].join(' ')}
        title={isMobile ? 'Long press to drag and reorder' : 'Drag to reorder'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div className={styles.experienceBlockContent}>
          <h3 className={styles.experienceBlockHeader}>{data.title}</h3>
          <p className={styles.experienceBlockCompany}>{data.companyName}</p>
          {!localData.isIncluded && (
            <p className={styles.experienceBlockExcluded}>
              This work experience is not currently included in your resume
            </p>
          )}
          <p className={styles.experienceBlockDate}>
            {`${data.startDate.month} ${data.startDate.year} - ${
              data.endDate.isPresent
                ? 'Present'
                : `${data.endDate.month} ${data.endDate.year}`
            }`}
          </p>
        </div>

        <div className={styles.experienceBlockActions}>
          <button
            type='button'
            data-no-dnd='true'
            className={styles.generateAllButton}
            onClick={handleAllBulletsRegenerate}
            disabled={
              isDragging ||
              isOverlay ||
              isAnyBulletRegenerating ||
              isAnyBulletBeingEdited
            }
          >
            <FaMagic size={14} />
            {animationKey > 0 && (
              <div key={animationKey} className={styles.magicRipple}></div>
            )}
          </button>
          <button
            type='button'
            data-no-dnd='true'
            className={styles.editButton}
            onClick={() => onBlockSelect(data.id)}
            disabled={
              isDragging ||
              isOverlay ||
              isAnyBulletRegenerating ||
              isAnyBulletBeingEdited
            }
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
            disabled={
              isDragging ||
              isOverlay ||
              isAnyBulletRegenerating ||
              isAnyBulletBeingEdited
            }
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

      {localData.bulletPoints.length > 0 && (
        <button
          className={`${styles.draggableExperienceBlockContainer} ${
            styles.drawerToggleButton
          } ${isExpanded ? [styles.noRadius, styles.expanded].join(' ') : ''} ${
            isDrawerDisabled ? styles.disabled : ''
          }`}
          onClick={onDrawerToggle}
          disabled={isDrawerDisabled}
          data-no-dnd='true'
        >
          {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>
      )}

      <div
        data-no-dnd='true'
        className={`${styles.experienceBlockDrawer} ${
          isExpanded ? styles.expanded : ''
        }`}
      >
        {localData.bulletPoints.length > 1 && (
          <div className={styles.lockAllButtons}>
            <button
              className={styles.lockAllButton}
              onClick={() => onLockToggleAll(data.id, true)}
              disabled={isAnyBulletBeingEdited || isAnyBulletRegenerating}
              data-no-dnd='true'
            >
              <FaLock size={10} />
              <span>Lock all</span>
            </button>
            <button
              className={styles.unlockAllButton}
              onClick={() => onLockToggleAll(data.id, false)}
              disabled={isAnyBulletBeingEdited || isAnyBulletRegenerating}
              data-no-dnd='true'
            >
              <FaUnlockAlt size={10} />
              <span>Unlock all</span>
            </button>
          </div>
        )}

        {bulletPoints.map((bullet, index) => {
          const isEditingThisBullet = editingBulletIndex === index
          const isRegeneratingThisBullet =
            isRegenerating &&
            regeneratingBullet?.section === data.id &&
            regeneratingBullet?.index === index

          return (
            <BulletPoint
              key={bullet.id}
              sectionId={data.id}
              index={index}
              text={bullet.text}
              keywordData={keywordData}
              editingText={isEditingThisBullet ? editingBulletText : ''}
              isRegenerating={isRegeneratingThisBullet}
              isEditing={isEditingThisBullet}
              disableAllControls={
                isAnyBulletRegenerating ||
                (isAnyBulletBeingEdited && !isEditingThisBullet)
              }
              errors={isEditingThisBullet ? bulletErrors : emptyErrors}
              isLocked={bullet.isLocked}
              settings={settings}
              isDangerousAction={true}
              onCancelEdit={onBulletCancel}
              onBulletDelete={handleBulletDelete}
              onBulletSave={onBulletSave}
              onBulletEdit={handleBulletEdit}
              onBulletRegenerate={handleBulletRegenerate}
              onTextareaChange={onTextareaChange}
              onLockToggle={handleBulletLockToggle}
            />
          )
        })}

        <button
          className={styles.addBulletButtonNested}
          onClick={() => onAddBullet(data.id)}
          disabled={isAnyBulletBeingEdited || isAnyBulletRegenerating}
          data-no-dnd='true'
        >
          <FaPlus size={12} />
        </button>
      </div>

      {localData.bulletPoints.length === 0 && !isExpanded && (
        <button
          className={styles.addBulletButton}
          onClick={() => onAddBullet(data.id)}
          disabled={isAnyBulletBeingEdited || isAnyBulletRegenerating}
          data-no-dnd='true'
        >
          <FaPlus size={12} />
        </button>
      )}

      {touchFeedback && touchFeedback.show && (
        <div
          className={styles.touchFeedback}
          style={{
            left: touchFeedback.x,
            top: touchFeedback.y,
          }}
        >
          <svg className={styles.progressRing}>
            <circle
              className={styles.progressBackground}
              cx='40'
              cy='40'
              r='35'
            />
            <circle
              className={styles.progressForeground}
              cx='40'
              cy='40'
              r='35'
            />
            <circle className={styles.progressCenter} cx='40' cy='40' r='12' />
          </svg>
        </div>
      )}
    </div>
  )
}

export default DraggableExperienceBlock
