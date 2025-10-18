import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import styles from './DraggableSkillBlock.module.scss'
import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { CSS } from '@dnd-kit/utilities'
import LongPressHandler from '@/components/shared/LongPressHandler/LongPressHandler'
import { debounce } from 'lodash'
import { SkillBlock } from '@/lib/types/skills'
import AutoCompleteInput from '@/components/shared/AutoCompleteInput/AutoCompleteInput'
import { FaEdit, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa'
import { useSkillsStore } from '@/stores/skillsStore'

interface DraggableSkillBlockProps {
  id: string
  title: string
  skills: string[]
  isOverlay: boolean
  isDropping: boolean
  isTemporary?: boolean
  isIncluded?: boolean
  onCategoryCreate?: () => void
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
}: DraggableSkillBlockProps) => {
  const titleInputRef = useRef<HTMLInputElement>(null)

  const {
    skillsData,
    resumeSkillsData,
    upsertResumeSkillBlock,
    // deleteResumeSkillBlock,
  } = useSkillsStore()

  const [titleValue, setTitleValue] = useState<string>(title)
  const [inputValue, setInputValue] = useState<string>('')
  const [isTitleFocused, setIsTitleFocused] = useState<boolean>(false)

  useEffect(() => {
    setTitleValue(title)
  }, [title])

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
    return resumeSkillsData.reduce((acc, block) => {
      return [...acc, ...block.skills]
    }, [] as string[])
  }, [resumeSkillsData])

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

  const updateBlockTitle = useCallback(
    (newTitle: string) => {
      if (isTemporary) {
        const newBlockCategory: SkillBlock = {
          id,
          title: newTitle,
          skills: skills,
          isIncluded: true,
        }
        upsertResumeSkillBlock(newBlockCategory)
        onCategoryCreate?.()
      } else {
        const currentBlock = resumeSkillsData.find((block) => block.id === id)
        if (currentBlock) {
          upsertResumeSkillBlock({ ...currentBlock, title: newTitle })
        }
      }
    },
    [
      id,
      isTemporary,
      skills,
      resumeSkillsData,
      upsertResumeSkillBlock,
      onCategoryCreate,
    ]
  )

  const debouncedUpdate = useMemo(
    () => debounce(updateBlockTitle, 1500),
    [updateBlockTitle]
  )

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const newTitle = e.target.value
      setTitleValue(newTitle)
      debouncedUpdate(newTitle)
    },
    [debouncedUpdate]
  )

  const handleDeleteCategory = useCallback((): void => {
    if (isTemporary) {
      onCategoryCreate?.()
      return
    }
    // if (
    //   !window.confirm(
    //     'Are you sure you want to delete this skill category? This action cannot be undone.'
    //   )
    // ) {
    //   return
    // }
    // deleteResumeSkillBlock(id)
  }, [isTemporary, onCategoryCreate, id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === ' ' || e.code === 'Space') {
        e.stopPropagation()
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        debouncedUpdate.cancel()
        updateBlockTitle((e.target as HTMLInputElement).value)
        ;(e.target as HTMLInputElement).blur()
      }
    },
    [debouncedUpdate, updateBlockTitle]
  )

  const handleTitleFocus = useCallback(() => setIsTitleFocused(true), [])
  const handleTitleBlur = useCallback(() => setIsTitleFocused(false), [])

  const handleEditIconClick = useCallback(
    () => titleInputRef.current?.focus(),
    []
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string): void => {
      const skillToAdd =
        filteredSuggestions.length === 1 &&
        suggestion.toLowerCase().trim() ===
          filteredSuggestions[0].toLowerCase().trim()
          ? filteredSuggestions[0]
          : suggestion

      const updatedSkills = [...skills, skillToAdd]

      if (isTemporary) {
        const newBlockCategory: SkillBlock = {
          id,
          title,
          skills: updatedSkills,
          isIncluded: true,
        }
        upsertResumeSkillBlock(newBlockCategory)
        onCategoryCreate?.()
      } else {
        const currentBlock = resumeSkillsData.find((block) => block.id === id)
        if (currentBlock) {
          upsertResumeSkillBlock({ ...currentBlock, skills: updatedSkills })
        }
      }
    },
    [
      skills,
      resumeSkillsData,
      id,
      title,
      upsertResumeSkillBlock,
      filteredSuggestions,
      isTemporary,
      onCategoryCreate,
    ]
  )

  const handleSkillRemove = useCallback(
    (skillToRemove: string): void => {
      if (isTemporary) return

      const updatedSkills = skills.filter((skill) => skill !== skillToRemove)
      const currentBlock = resumeSkillsData.find((block) => block.id === id)
      if (currentBlock) {
        upsertResumeSkillBlock({ ...currentBlock, skills: updatedSkills })
      }
    },
    [skills, isTemporary, resumeSkillsData, id, upsertResumeSkillBlock]
  )

  const memoizedSkillChips = useMemo(() => {
    return skills.map((skill) => (
      <div key={skill} className={styles.resumeSkillChip} data-no-dnd='true'>
        <span className={styles.skillText}>{skill}</span>
        <button
          type='button'
          className={styles.removeSkillButton}
          onClick={() => handleSkillRemove(skill)}
          data-no-dnd='true'
          aria-label={`Remove ${skill}`}
        >
          <FaTimes size={10} />
        </button>
      </div>
    ))
  }, [skills, handleSkillRemove])

  const handleSkillBlockInclusionToggle = useCallback((): void => {
    const currentBlock = resumeSkillsData.find((block) => block.id === id)
    if (currentBlock) {
      upsertResumeSkillBlock({
        ...currentBlock,
        isIncluded: !currentBlock.isIncluded,
      })
    }
  }, [resumeSkillsData, id, upsertResumeSkillBlock])

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
                value={titleValue}
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
    prevProps.onCategoryCreate === nextProps.onCategoryCreate
  )
})
