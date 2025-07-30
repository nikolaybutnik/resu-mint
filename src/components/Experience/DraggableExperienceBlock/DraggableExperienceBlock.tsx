import React, { useCallback, useMemo, useRef, useState } from 'react'
import styles from './DraggableExperienceBlock.module.scss'
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
import { bulletService } from '@/lib/services/bulletService'
import { useExperienceStore } from '@/stores'
import { SectionType } from '@/lib/types/api'

interface DraggableExperienceBlockProps {
  data: ExperienceBlockData
  keywordData: KeywordData | null
  isExpanded: boolean
  isOverlay?: boolean
  isDropping?: boolean
  onSectionEdit: (id: string) => void
  onDrawerToggle: () => void
}

const DraggableExperienceBlock: React.FC<DraggableExperienceBlockProps> =
  React.memo(
    ({
      data,
      keywordData,
      isExpanded,
      isOverlay = false,
      isDropping = false,
      onSectionEdit,
      onDrawerToggle,
    }) => {
      const isFirstRender = useRef(true)

      const [animationKey, setAnimationKey] = useState(0)
      const [temporaryBullet, setTemporaryBullet] =
        useState<BulletPointType | null>(null)

      const { data: experienceData, save } = useExperienceStore()
      const { attributes, listeners, setNodeRef, transform, isDragging } =
        useSortable({
          id: data.id,
          disabled: isOverlay,
        })

      const style = isOverlay
        ? { zIndex: 100 }
        : {
            transform: CSS.Translate.toString(transform),
            transition:
              isDropping || isDragging ? 'none' : 'transform 0.2s ease',
            zIndex: isDragging ? 10 : 1,
            opacity: isDragging ? 0.5 : 1,
            touchAction: isDragging ? 'none' : 'manipulation',
          }

      const memoizedBulletPoints = useMemo(
        () => data.bulletPoints,
        [data.bulletPoints]
      )

      const handleBulletCancel = useCallback(() => {
        setTemporaryBullet(null)
      }, [])

      const handleLockAllToggle = useCallback(
        async (
          sectionId: string,
          sectionType: SectionType,
          shouldLock: boolean
        ): Promise<void> => {
          await bulletService.toggleBulletLockAll(
            sectionId,
            sectionType,
            shouldLock
          )
        },
        []
      )

      const renderedBullets = useMemo(
        () =>
          memoizedBulletPoints.map((bullet) => (
            <BulletPoint
              key={bullet.id}
              sectionId={data.id}
              sectionType='experience'
              keywordData={keywordData}
              isDangerousAction={true}
              bulletData={bullet}
              onBulletCancel={handleBulletCancel}
            />
          )),
        [memoizedBulletPoints, data.id, keywordData, handleBulletCancel]
      )

      const handleSectionInclusionToggle = useCallback(() => {
        const updatedSection = { ...data, isIncluded: !data.isIncluded }
        const updatedData = experienceData.map((section) =>
          section.id === data.id ? updatedSection : section
        )
        save(updatedData)
      }, [data, experienceData, save])

      const handleBulletAdd = useCallback(() => {
        const newBullet: BulletPointType = {
          id: uuidv4(),
          text: '',
          isLocked: false,
          isTemporary: true,
        }
        setTemporaryBullet(newBullet)
        if (!isExpanded) onDrawerToggle()
      }, [isExpanded, onDrawerToggle])

      const handleAllBulletsRegenerate = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        isFirstRender.current = false
        setAnimationKey((prev) => prev + 1)
      }, [])

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
            disabled={isOverlay}
            title='Long press to drag and reorder'
          >
            <div className={styles.experienceBlockContent}>
              <h3 className={styles.experienceBlockHeader}>{data.title}</h3>
              <p className={styles.experienceBlockCompany}>
                {data.companyName}
              </p>
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
                style={{
                  display: 'none', // TODO: temporary
                }}
                type='button'
                data-no-dnd='true'
                className={styles.generateAllButton}
                onClick={handleAllBulletsRegenerate}
                disabled={isDragging || isOverlay}
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
                onClick={() => onSectionEdit(data.id)}
                disabled={isDragging || isOverlay}
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
                onClick={handleSectionInclusionToggle}
                disabled={isDragging || isOverlay}
                title={
                  data.isIncluded ? 'Exclude from resume' : 'Include in resume'
                }
              >
                {data.isIncluded ? (
                  <FaEye size={14} />
                ) : (
                  <FaEyeSlash size={14} />
                )}
              </button>
            </div>
          </LongPressHandler>

          {memoizedBulletPoints.length > 0 && (
            <button
              className={`${styles.draggableExperienceBlockContainer} ${
                styles.drawerToggleButton
              } ${
                isExpanded ? [styles.noRadius, styles.expanded].join(' ') : ''
              } ${isOverlay ? styles.disabled : ''}`}
              onClick={onDrawerToggle}
              disabled={isOverlay}
              data-no-dnd='true'
            >
              {isExpanded ? (
                <FaChevronUp size={12} />
              ) : (
                <FaChevronDown size={12} />
              )}
            </button>
          )}

          <div
            data-no-dnd='true'
            className={`${styles.experienceBlockDrawer} ${
              isExpanded ? styles.expanded : ''
            }`}
          >
            {memoizedBulletPoints.length > 1 && (
              <div className={styles.lockAllButtons}>
                <button
                  className={styles.lockAllButton}
                  onClick={() =>
                    handleLockAllToggle(data.id, 'experience', true)
                  }
                  disabled={isOverlay}
                  data-no-dnd='true'
                >
                  <FaLock size={10} />
                  <span>Lock all</span>
                </button>
                <button
                  className={styles.unlockAllButton}
                  onClick={() =>
                    handleLockAllToggle(data.id, 'experience', false)
                  }
                  disabled={isOverlay}
                  data-no-dnd='true'
                >
                  <FaUnlockAlt size={10} />
                  <span>Unlock all</span>
                </button>
              </div>
            )}

            {renderedBullets}
            {temporaryBullet && (
              <BulletPoint
                key={temporaryBullet.id}
                sectionId={data.id}
                sectionType='experience'
                keywordData={keywordData}
                isDangerousAction={false}
                bulletData={temporaryBullet}
                onBulletCancel={handleBulletCancel}
              />
            )}

            <button
              className={styles.addBulletButtonNested}
              onClick={handleBulletAdd}
              disabled={isOverlay}
              data-no-dnd='true'
            >
              <FaPlus size={12} />
            </button>
          </div>

          {memoizedBulletPoints.length === 0 && !isExpanded && (
            <button
              className={styles.addBulletButton}
              onClick={handleBulletAdd}
              disabled={isOverlay}
              data-no-dnd='true'
            >
              <FaPlus size={12} />
            </button>
          )}
        </div>
      )
    }
  )

DraggableExperienceBlock.displayName = 'DraggableExperienceBlock'

export default DraggableExperienceBlock
