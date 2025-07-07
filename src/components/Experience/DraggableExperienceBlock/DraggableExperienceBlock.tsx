import styles from './DraggableExperienceBlock.module.scss'
import { useCallback, useMemo, useRef, useState } from 'react'
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
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { KeywordData } from '@/lib/types/keywords'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { BulletPoint as BulletPointType } from '@/lib/types/experience'
import { v4 as uuidv4 } from 'uuid'

interface DraggableExperienceBlockProps {
  data: ExperienceBlockData
  editingBulletIndex: number | null
  editingBulletText: string
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
  onBulletDelete: (sectionId: string, index: number) => void
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
  isRegenerating,
  regeneratingBullet,
  isAnyBulletBeingEdited,
  isAnyBulletRegenerating,
  isExpanded,
  isOverlay = false,
  isDropping = false,
  onBlockSelect,
  onRegenerateAllBullets,
  onAddBullet,
  onDrawerToggle,
  onLockToggleAll,
  onToggleInclude,
}) => {
  const isFirstRender = useRef(true)

  const [animationKey, setAnimationKey] = useState(0)
  const [temporaryBullet, setTemporaryBullet] =
    useState<BulletPointType | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: data.id,
      disabled: isOverlay || isAnyBulletBeingEdited || isAnyBulletRegenerating,
    })

  const style = isOverlay
    ? { zIndex: 100 }
    : {
        transform: CSS.Translate.toString(transform),
        transition: isDropping || isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        touchAction: isDragging ? 'none' : 'manipulation',
      }

  // const handleToggleInclude = () => {
  // const updatedData = { ...localData, isIncluded: !localData.isIncluded }
  // setLocalData(updatedData)
  // onToggleInclude(data.id, updatedData.isIncluded)
  // }

  const bulletPoints = useMemo(() => data.bulletPoints, [data.bulletPoints])

  const isEditingThisSection =
    editingBulletIndex !== null &&
    data.id === (editingBulletText ? data.id : null)
  const isDrawerDisabled =
    (isAnyBulletBeingEdited && !isEditingThisSection) || isAnyBulletRegenerating

  // TODO: implement
  const handleAllBulletsRegenerate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      isFirstRender.current = false
      setAnimationKey((prev) => prev + 1)
      onRegenerateAllBullets()
    },
    [data, onRegenerateAllBullets]
  )

  const handleBulletAdd = () => {
    const newBullet: BulletPointType = {
      id: uuidv4(),
      text: '',
      isLocked: false,
      isTemporary: true,
    }
    setTemporaryBullet(newBullet)
  }

  const handleBulletCancel = () => {
    setTemporaryBullet(null)
  }

  return (
    <div
      ref={isOverlay ? null : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={[
        styles.draggableExperienceBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
        !data.isIncluded ? styles.excluded : '',
      ].join(' ')}
    >
      <LongPressHandler
        className={styles.draggableExperienceBlock}
        disabled={isAnyBulletBeingEdited || isAnyBulletRegenerating}
        title='Long press to drag and reorder'
      >
        <div className={styles.experienceBlockContent}>
          <h3 className={styles.experienceBlockHeader}>{data.title}</h3>
          <p className={styles.experienceBlockCompany}>{data.companyName}</p>
          {!data.isIncluded && (
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
              data.isIncluded ? styles.included : styles.excluded,
            ].join(' ')}
            // onClick={handleToggleInclude}
            disabled={
              isDragging ||
              isOverlay ||
              isAnyBulletRegenerating ||
              isAnyBulletBeingEdited
            }
            title={
              data.isIncluded ? 'Exclude from resume' : 'Include in resume'
            }
          >
            {data.isIncluded ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
          </button>
        </div>
      </LongPressHandler>

      {data.bulletPoints.length > 0 && (
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
        {data.bulletPoints.length > 1 && (
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
              sectionType='experience'
              keywordData={keywordData}
              isRegenerating={isRegeneratingThisBullet}
              disableAllControls={
                isAnyBulletRegenerating ||
                (isAnyBulletBeingEdited && !isEditingThisBullet)
              }
              isLocked={bullet.isLocked ?? false}
              isDangerousAction={true}
              bulletData={bullet}
              onBulletCancel={handleBulletCancel}
            />
          )
        })}
        {temporaryBullet && (
          <BulletPoint
            key={temporaryBullet.id}
            sectionId={data.id}
            sectionType='experience'
            keywordData={keywordData}
            isRegenerating={false}
            disableAllControls={false}
            isLocked={false}
            isDangerousAction={false}
            bulletData={temporaryBullet}
            onBulletCancel={handleBulletCancel}
          />
        )}

        <button
          className={styles.addBulletButtonNested}
          onClick={handleBulletAdd}
          disabled={isAnyBulletBeingEdited || isAnyBulletRegenerating}
          data-no-dnd='true'
        >
          <FaPlus size={12} />
        </button>
      </div>

      {data.bulletPoints.length === 0 && !isExpanded && (
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

export default DraggableExperienceBlock
