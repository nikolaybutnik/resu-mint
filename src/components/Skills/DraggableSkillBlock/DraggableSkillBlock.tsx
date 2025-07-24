import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import styles from './DraggableSkillBlock.module.scss'
import { useMemo, useRef, useState, useCallback } from 'react'
import { CSS } from '@dnd-kit/utilities'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { debounce } from 'lodash'
import { useSkillsStore } from '@/stores/skillsStore'
import { SkillBlock } from '@/lib/types/skills'
import AutoCompleteInput from '@/components/shared/AutoCompleteInput/AutoCompleteInput'
import { FaEdit } from 'react-icons/fa'

interface DraggableSkillBlockProps {
  id: string
  title: string
  skills: string[]
  isOverlay: boolean
  isDropping: boolean
  isTemporary?: boolean
  onCategoryCreate?: () => void
}

const DraggableSkillBlock: React.FC<DraggableSkillBlockProps> = React.memo(
  ({
    id,
    title,
    skills,
    isOverlay = false,
    isDropping = false,
    isTemporary = false,
    onCategoryCreate,
  }: DraggableSkillBlockProps) => {
    const blockCategory = useRef<string>(title)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const [selectedBlockSkills, setSelectedBlockSkills] =
      useState<string[]>(skills)
    const [inputValue, setInputValue] = useState<string>('')
    const [isTitleFocused, setIsTitleFocused] = useState<boolean>(false)

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
    }, [skillsData.hardSkills.skills, skillsData.softSkills.skills])

    const allSelectedSkills = useMemo(() => {
      return resumeSkillData.reduce((acc, block) => {
        return [...acc, ...block.skills]
      }, [] as string[])
    }, [resumeSkillData])

    const filteredSuggestions = useMemo(() => {
      let filtered = allSuggestions.filter(
        (suggestion) => !allSelectedSkills.includes(suggestion)
      )

      if (inputValue.trim()) {
        filtered = filtered.filter((suggestion) =>
          suggestion.toLowerCase().includes(inputValue.toLowerCase())
        )
      }

      return filtered
    }, [allSuggestions, allSelectedSkills, inputValue])

    const handleCategoryChange = useMemo(
      () =>
        debounce((e: React.ChangeEvent<HTMLInputElement>): void => {
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
        }, 1500),
      [
        id,
        isTemporary,
        selectedBlockSkills,
        resumeSkillData,
        saveResumeSkillsData,
        onCategoryCreate,
      ]
    )

    const handleDeleteCategory = useCallback((): void => {
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
    }, [
      isTemporary,
      onCategoryCreate,
      resumeSkillData,
      id,
      saveResumeSkillsData,
    ])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === ' ' || e.code === 'Space') {
          e.stopPropagation()
        }
      },
      []
    )

    const handleTitleFocus = useCallback((): void => {
      setIsTitleFocused(true)
    }, [])

    const handleTitleBlur = useCallback((): void => {
      setIsTitleFocused(false)
    }, [])

    const handleEditIconClick = useCallback((): void => {
      titleInputRef.current?.focus()
    }, [])

    const handleSuggestionClick = useCallback(
      (suggestion: string): void => {
        const updatedSkills = [...selectedBlockSkills, suggestion]
        setSelectedBlockSkills(updatedSkills)

        if (!isTemporary) {
          const updatedSkillBlocks = resumeSkillData.map((skill) =>
            skill.id === id ? { ...skill, skills: updatedSkills } : skill
          )
          saveResumeSkillsData(updatedSkillBlocks)
        }
      },
      [
        selectedBlockSkills,
        isTemporary,
        resumeSkillData,
        id,
        saveResumeSkillsData,
      ]
    )

    const handleSkillRemove = useCallback(
      (skillToRemove: string): void => {
        const updatedSkills = selectedBlockSkills.filter(
          (skill) => skill !== skillToRemove
        )
        setSelectedBlockSkills(updatedSkills)

        if (!isTemporary) {
          const updatedSkillBlocks = resumeSkillData.map((skill) =>
            skill.id === id ? { ...skill, skills: updatedSkills } : skill
          )
          saveResumeSkillsData(updatedSkillBlocks)
        }
      },
      [
        selectedBlockSkills,
        isTemporary,
        resumeSkillData,
        id,
        saveResumeSkillsData,
      ]
    )

    const handleSkillInputChange = useMemo(
      () =>
        debounce((value: string): void => {
          setInputValue(value)
        }, 250),
      []
    )

    const memoizedSkillChips = useMemo(() => {
      return selectedBlockSkills.map((skill) => (
        <div key={skill} className={styles.resumeSkillChip}>
          <span className={styles.skillText}>{skill}</span>
          <button
            type='button'
            className={styles.removeSkillButton}
            onClick={() => handleSkillRemove(skill)}
            data-no-dnd='true'
            aria-label={`Remove ${skill}`}
          >
            ×
          </button>
        </div>
      ))
    }, [selectedBlockSkills, handleSkillRemove])

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
          <div className={styles.skillCategoryContent}>
            <div className={styles.skillCategoryActions}>
              <button
                type='button'
                className={styles.deleteButton}
                onClick={handleDeleteCategory}
                data-no-dnd='true'
                disabled={isDragging || isOverlay}
              >
                {isTemporary ? 'Cancel' : 'Delete'}
              </button>
            </div>
            <div className={styles.skillCategoryContainer}>
              <span className={styles.skillCategoryLabel}>
                Skill Category (optional)
              </span>
              <div className={styles.titleInputWrapper}>
                <input
                  ref={titleInputRef}
                  type='text'
                  defaultValue={blockCategory.current}
                  placeholder='e.g. "Programming Languages"'
                  onChange={handleCategoryChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleTitleFocus}
                  onBlur={handleTitleBlur}
                  data-no-dnd='true'
                />
                {!isTitleFocused && (
                  <FaEdit
                    className={styles.editIcon}
                    size={12}
                    onClick={handleEditIconClick}
                  />
                )}
              </div>
            </div>

            <AutoCompleteInput
              suggestions={filteredSuggestions}
              existingSkills={allSelectedSkills}
              onSuggestionClick={handleSuggestionClick}
              onChange={handleSkillInputChange}
            />

            <div className={styles.resumeSkillsChipsContainer}>
              {memoizedSkillChips}
            </div>
          </div>
        </LongPressHandler>
      </div>
    )
  }
)

DraggableSkillBlock.displayName = 'DraggableSkillBlock'

export default React.memo(DraggableSkillBlock, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.skills.length === nextProps.skills.length &&
    prevProps.skills.every(
      (skill, index) => skill === nextProps.skills[index]
    ) &&
    prevProps.isOverlay === nextProps.isOverlay &&
    prevProps.isDropping === nextProps.isDropping &&
    prevProps.isTemporary === nextProps.isTemporary
  )
})
