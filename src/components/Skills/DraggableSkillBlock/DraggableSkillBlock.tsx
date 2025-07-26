import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import styles from './DraggableSkillBlock.module.scss'
import { useMemo, useRef, useState, useCallback } from 'react'
import { CSS } from '@dnd-kit/utilities'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { debounce } from 'lodash'
import { SkillBlock, Skills } from '@/lib/types/skills'
import AutoCompleteInput from '@/components/shared/AutoCompleteInput/AutoCompleteInput'
import { FaEdit, FaEye, FaEyeSlash } from 'react-icons/fa'

interface DraggableSkillBlockProps {
  id: string
  title: string
  skills: string[]
  isOverlay: boolean
  isDropping: boolean
  isTemporary?: boolean
  isIncluded?: boolean
  onCategoryCreate?: () => void
  skillsData: Skills
  resumeSkillData: SkillBlock[]
  saveResumeSkillsData: (data: SkillBlock[]) => void
}

const DraggableSkillBlock: React.FC<DraggableSkillBlockProps> = ({
  id,
  title,
  skills,
  isOverlay = false,
  isDropping = false,
  isTemporary = false,
  isIncluded = false,
  onCategoryCreate,
  skillsData,
  resumeSkillData,
  saveResumeSkillsData,
}: DraggableSkillBlockProps) => {
  const blockCategory = useRef<string>(title)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [selectedBlockSkills, setSelectedBlockSkills] =
    useState<string[]>(skills)
  const [inputValue, setInputValue] = useState<string>('')
  const [isTitleFocused, setIsTitleFocused] = useState<boolean>(false)

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
        let updatedSkillBlocks: SkillBlock[] = [...resumeSkillData]

        if (isTemporary) {
          const newBlockCategory: SkillBlock = {
            id,
            title: e.target.value,
            skills: selectedBlockSkills,
            isIncluded: true,
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
  }, [isTemporary, onCategoryCreate, resumeSkillData, id, saveResumeSkillsData])

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
      const currentFilteredSuggestions = filteredSuggestions
      const updatedSkills = [...selectedBlockSkills]
      const [firstSuggestion] = currentFilteredSuggestions

      if (
        filteredSuggestions.length === 1 &&
        suggestion.toLowerCase().trim() === firstSuggestion.toLowerCase().trim()
      ) {
        updatedSkills.push(firstSuggestion)
      } else updatedSkills.push(suggestion)

      setSelectedBlockSkills(updatedSkills)

      let updatedSkillBlocks: SkillBlock[] = [...resumeSkillData]

      if (isTemporary) {
        const newBlockCategory: SkillBlock = {
          id,
          title: blockCategory.current,
          skills: updatedSkills,
          isIncluded: true,
        }
        updatedSkillBlocks.push(newBlockCategory)
        onCategoryCreate?.()
      } else {
        updatedSkillBlocks = updatedSkillBlocks.map((skill) =>
          skill.id === id ? { ...skill, skills: updatedSkills } : skill
        )
      }

      saveResumeSkillsData(updatedSkillBlocks)
    },
    [
      selectedBlockSkills,
      resumeSkillData,
      id,
      saveResumeSkillsData,
      filteredSuggestions,
      inputValue,
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

  const memoizedSkillChips = useMemo(() => {
    return selectedBlockSkills.map((skill) => (
      <div key={skill} className={styles.resumeSkillChip} data-no-dnd='true'>
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

  const handleSkillBlockInclusionToggle = (): void => {
    const updatedSkillBlocks: SkillBlock[] = resumeSkillData.map((block) => {
      return block.id === id
        ? {
            ...block,
            isIncluded: !block.isIncluded,
          }
        : block
    })

    saveResumeSkillsData(updatedSkillBlocks)
  }

  return (
    <div
      className={[
        styles.draggableSkillBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
        isIncluded || isTemporary ? styles.included : styles.excluded,
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

            {!isTemporary && (
              <button
                type='button'
                data-no-dnd='true'
                className={styles.toggleIncludeButton}
                onClick={handleSkillBlockInclusionToggle}
                disabled={isDragging || isOverlay}
                title={isIncluded ? 'Exclude from resume' : 'Include in resume'}
              >
                {isIncluded ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
              </button>
            )}
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

          <div className={styles.autoCompleteWrapper}>
            <AutoCompleteInput
              suggestions={filteredSuggestions}
              existingSkills={allSelectedSkills}
              onSuggestionClick={handleSuggestionClick}
              onChange={setInputValue}
            />
          </div>

          <div className={styles.resumeSkillsChipsContainer}>
            {memoizedSkillChips.length ? (
              memoizedSkillChips
            ) : (
              <div className={styles.noSkillsMessage}>
                Skills you select will be added to your resume.
              </div>
            )}
          </div>
        </div>
      </LongPressHandler>
    </div>
  )
}

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
    prevProps.isTemporary === nextProps.isTemporary &&
    prevProps.isIncluded === nextProps.isIncluded &&
    prevProps.onCategoryCreate === nextProps.onCategoryCreate &&
    prevProps.skillsData === nextProps.skillsData &&
    prevProps.resumeSkillData === nextProps.resumeSkillData &&
    prevProps.saveResumeSkillsData === nextProps.saveResumeSkillsData
  )
})
