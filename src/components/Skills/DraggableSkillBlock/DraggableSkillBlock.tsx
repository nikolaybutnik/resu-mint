import { useSortable } from '@dnd-kit/sortable'
import styles from './DraggableSkillBlock.module.scss'
import { useMemo, useRef, useState } from 'react'
import { CSS } from '@dnd-kit/utilities'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { debounce } from 'lodash'
import { useSkillsStore } from '@/stores/skillsStore'
import { SkillBlock } from '@/lib/types/skills'

interface DraggableSkillBlockProps {
  id: string
  title: string
  skills: string[]
  isOverlay: boolean
  isDropping: boolean
  isTemporary?: boolean
  onCategoryCreate?: () => void
}

const DraggableSkillBlock = ({
  id,
  title,
  skills,
  isOverlay = false,
  isDropping = false,
  isTemporary = false,
  onCategoryCreate,
}: DraggableSkillBlockProps) => {
  const blockCategory = useRef(title)
  const [blockSkills, setBlockSkills] = useState(skills)

  const { resumeSkillData, saveResumeSkillsData } = useSkillsStore()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id,
      disabled: isOverlay,
    })

  const style = useMemo(
    () =>
      isOverlay
        ? { zIndex: 100 }
        : {
            transform: CSS.Translate.toString(transform),
            transition:
              isDropping || isDragging ? 'none' : 'transform 0.2s ease',
            zIndex: isDragging ? 10 : 1,
            opacity: isDragging ? 0.5 : 1,
            touchAction: isDragging ? 'none' : 'manipulation',
          },
    [isOverlay, transform, isDropping, isDragging]
  )

  const handleCategoryChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      // if (isTemporary && !blockSkills.length) return

      let updatedSkillBlocks: SkillBlock[] = [...resumeSkillData]

      if (isTemporary) {
        const newBlockCategory: SkillBlock = {
          id,
          title: e.target.value,
          skills: blockSkills,
        }
        updatedSkillBlocks.push(newBlockCategory)
        onCategoryCreate?.()
      } else {
        updatedSkillBlocks = updatedSkillBlocks.map((skill) =>
          skill.id === id ? { ...skill, title: e.target.value } : skill
        )
      }

      saveResumeSkillsData(updatedSkillBlocks)
    },
    1500
  )

  const handleDeleteCategory = (): void => {
    if (isTemporary) {
      onCategoryCreate?.()
      return
    }

    if (
      window.confirm(
        'Are you sure you want to delete this skill category? This action cannot be undone.'
      )
    ) {
      const updatedSkillBlocks = resumeSkillData.filter(
        (skill) => skill.id !== id
      )
      saveResumeSkillsData(updatedSkillBlocks)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation()
    }
  }

  return (
    <div
      className={[
        styles.draggableSkillBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
      ].join(' ')}
      {...(isTemporary && { 'data-no-dnd': 'true' })}
      ref={isOverlay ? null : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
    >
      <LongPressHandler
        className={styles.draggableProjectBlock}
        disabled={isOverlay}
        title='Long press to drag and reorder'
      >
        <div className={styles.skillCategoryContainer}>
          <span>Skill Category (optional)</span>
          <input
            type='text'
            defaultValue={blockCategory.current}
            placeholder='e.g. "Programming Languages"'
            onChange={handleCategoryChange}
            onKeyDown={handleKeyDown}
            data-no-dnd='true'
          />
        </div>
        {/* <h3 className={styles.blockTitle}>{title}</h3>
        <div className={styles.skillsContainer}>
          {skills.map((skill) => (
            <div key={skill} className={styles.skill}>
              {skill}
            </div>
          ))}
        </div> */}
        <button className={styles.deleteButton} onClick={handleDeleteCategory}>
          {isTemporary ? 'Cancel' : 'Delete'}
        </button>
      </LongPressHandler>
    </div>
  )
}

export default DraggableSkillBlock
