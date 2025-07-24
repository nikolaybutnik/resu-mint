import { useSortable } from '@dnd-kit/sortable'
import styles from './DraggableSkillBlock.module.scss'
import { useMemo, useRef, useState } from 'react'
import { CSS } from '@dnd-kit/utilities'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { debounce } from 'lodash'
import { useSkillsStore } from '@/stores/skillsStore'
import { SkillBlock } from '@/lib/types/skills'
import AutoCompleteInput from '@/components/shared/AutoCompleteInput/AutoCompleteInput'

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
  const blockCategory = useRef<string>(title)
  const [selectedBlockSkills, setSelectedBlockSkills] =
    useState<string[]>(skills)
  const [inputValue, setInputValue] = useState<string>('')

  const {
    data: skillsData,
    resumeSkillData,
    saveResumeSkillsData,
  } = useSkillsStore()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id,
      disabled: isOverlay || isTemporary,
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

  const allSuggestions = useMemo(() => {
    return [...skillsData.hardSkills.skills, ...skillsData.softSkills.skills]
  }, [skillsData])

  const filteredSuggestions = useMemo(() => {
    const allSelectedSkills = resumeSkillData.reduce((acc, block) => {
      return [...acc, ...block.skills]
    }, [] as string[])

    let filtered = allSuggestions.filter(
      (suggestion) => !allSelectedSkills.includes(suggestion)
    )

    if (inputValue.trim()) {
      filtered = filtered.filter((suggestion) =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase())
      )
    }

    return filtered
  }, [allSuggestions, resumeSkillData, inputValue])

  const handleCategoryChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (isTemporary && !selectedBlockSkills.length) return

      let updatedSkillBlocks: SkillBlock[] = [...resumeSkillData]

      if (isTemporary) {
        const newBlockCategory: SkillBlock = {
          id,
          title: e.target.value,
          skills: selectedBlockSkills,
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

  const handleSuggestionClick = (suggestion: string): void => {
    const updatedSkills = [...selectedBlockSkills, suggestion]
    setSelectedBlockSkills(updatedSkills)

    const updatedSkillBlocks = resumeSkillData.map((skill) =>
      skill.id === id ? { ...skill, skills: updatedSkills } : skill
    )
    saveResumeSkillsData(updatedSkillBlocks)
  }

  const handleSkillInputChange = debounce((value: string): void => {
    setInputValue(value)
  }, 250)

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
        <AutoCompleteInput
          suggestions={filteredSuggestions}
          onSuggestionClick={handleSuggestionClick}
          onChange={handleSkillInputChange}
        />
        <button className={styles.deleteButton} onClick={handleDeleteCategory}>
          {isTemporary ? 'Cancel' : 'Delete'}
        </button>

        <div className={styles.resumeSkillsChipsContainer}>
          {selectedBlockSkills.map((skill) => (
            <div key={skill} className={styles.resumeSkillChip}>
              {skill}
            </div>
          ))}
        </div>
      </LongPressHandler>
    </div>
  )
}

export default DraggableSkillBlock
