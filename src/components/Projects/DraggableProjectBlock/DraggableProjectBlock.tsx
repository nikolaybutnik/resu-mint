import styles from './DraggableProjectBlock.module.scss'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  FaPen,
  FaChevronDown,
  FaChevronUp,
  FaMagic,
  FaPlus,
  FaLock,
  FaUnlockAlt,
} from 'react-icons/fa'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProjectBlockData } from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { BulletPointErrors } from '@/lib/types/errors'

interface DraggableProjectBlockProps {
  data: ProjectBlockData
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
  onBlockSelect: (id: string) => void
  onEditBullets: (updatedBlock: ProjectBlockData) => void
  onRegenerateBullet: (
    sectionId: string,
    index: number,
    isProjectEditForm: boolean
  ) => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onDrawerToggle: () => void
  onLockToggle: (sectionId: string, index: number) => void
  onLockToggleAll: (sectionId: string, shouldLock: boolean) => void
}

const DraggableProjectBlock: React.FC<DraggableProjectBlockProps> = ({
  data,
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
  onEditBullets,
  onRegenerateBullet,
  onAddBullet,
  onEditBullet,
  onBulletSave,
  onBulletCancel,
  onBulletDelete,
  onTextareaChange,
  onDrawerToggle,
  onLockToggle,
  onLockToggleAll,
}) => {
  const isFirstRender = useRef(true)

  const [localData, setLocalData] = useState<ProjectBlockData>(data)
  const [animationKey, setAnimationKey] = useState(0)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: data.id,
      disabled: isOverlay || isAnyBulletBeingEdited || isAnyBulletRegenerating,
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

  const handleGenerateAllBullets = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      isFirstRender.current = false
      setAnimationKey((prev) => prev + 1)
      onEditBullets(data)
    },
    [data, onEditBullets]
  )

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
          {data.technologies.length > 0 && (
            <div className={styles.projectBlockTechTags}>
              {data.technologies.map((tech, index) => (
                <span key={index} className={styles.techTag}>
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.projectBlockActions}>
          <button
            type='button'
            data-no-dnd='true'
            className={styles.generateAllButton}
            onClick={handleGenerateAllBullets}
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
        </div>
      </div>

      {localData.bulletPoints.length > 0 && (
        <button
          className={`${styles.draggableProjectBlockContainer} ${
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
        className={`${styles.projectBlockDrawer} ${
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
              onCancelEdit={onBulletCancel}
              onBulletDelete={(index) => onBulletDelete(data.id, index)}
              onBulletSave={onBulletSave}
              onBulletEdit={(index) => onEditBullet(data.id, index)}
              inBulletRegenerate={(sectionId, index) => {
                onRegenerateBullet(sectionId, index, false)
              }}
              onTextareaChange={onTextareaChange}
              onLockToggle={(sectionId, index) => {
                onLockToggle(sectionId, index)
              }}
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
    </div>
  )
}

export default DraggableProjectBlock
