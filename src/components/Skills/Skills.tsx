import styles from './Skills.module.scss'
import { useState, useRef, useCallback, useMemo, JSX, useEffect } from 'react'
import { FaPlus, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useSkillsStore } from '@/stores/skillsStore'
import {
  SKILL_TYPES,
  SkillBlock,
  SkillType,
  Skills as SkillsType,
} from '@/lib/types/skills'
import Suggestions from './Suggestions/Suggestions'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensors,
  KeyboardSensor,
  useSensor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import { MouseSensor, TouchSensor } from '@/lib/clientUtils'
import { DROPPING_ANIMATION_DURATION } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'
import DraggableSkillBlock from './DraggableSkillBlock/DraggableSkillBlock'
import { toast } from '@/stores/toastStore'

const Skills: React.FC = () => {
  const hardSkillInputRef = useRef<HTMLInputElement>(null)
  const softSkillInputRef = useRef<HTMLInputElement>(null)
  // TODO: Re-think how suggestions are presented to the user and how/when they're populated.
  // The floating "cloud" feature feels clunky and could be improved.
  const hardSuggestionsRef = useRef<HTMLDivElement>(null)
  const softSuggestionsRef = useRef<HTMLDivElement>(null)

  const {
    skillsData,
    resumeSkillsData,
    error: storeError,
    upsertSkills,
    reorderResumeSkills,
    clearError,
  } = useSkillsStore()

  const [hardSkillInput, setHardSkillInput] = useState('')
  const [softSkillInput, setSoftSkillInput] = useState('')
  const [focusedInput, setFocusedInput] = useState<SkillType | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)
  const [temporarySkillCategory, setTemporarySkillCategory] =
    useState<SkillBlock | null>(null)
  const [isHardSkillsExpanded, setIsHardSkillsExpanded] = useState(false)
  const [isSoftSkillsExpanded, setIsSoftSkillsExpanded] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 750,
        tolerance: 15,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (storeError) {
      switch (storeError.code) {
        case 'NETWORK_ERROR':
          toast.error(
            'Network connection failed. Please check your internet connection.'
          )
          break
        case 'VALIDATION_ERROR':
          toast.error('Invalid data provided. Please check your input.')
          break
        case 'UNKNOWN_ERROR':
          if (storeError.message.includes('Failed to load')) {
            toast.error('Failed to load your skills. Please refresh the page.')
          } else if (storeError.message.includes('Failed to refresh')) {
            toast.warning(
              'Unable to refresh skills data. Some information may be outdated.'
            )
          } else {
            toast.error('Failed to save your changes. Please try again.')
          }
          break
        default:
          toast.error('An unexpected error occurred. Please try again.')
      }
      clearError()
    }
  }, [storeError, clearError])

  const normalizeSkill = (skill: string): string => {
    return skill.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  const handleAddSkill = (type: SkillType, value: string): void => {
    const trimmedSkill = value.trim()
    if (!trimmedSkill) return

    const skillKey = type === SKILL_TYPES.HARD ? 'hardSkills' : 'softSkills'
    const isDuplicate = skillsData[skillKey].skills.some(
      (existingSkill) =>
        normalizeSkill(existingSkill) === normalizeSkill(trimmedSkill)
    )

    if (isDuplicate) return

    const updatedSkills: SkillsType = {
      ...skillsData,
      [skillKey]: {
        skills: [...skillsData[skillKey].skills, trimmedSkill],
        suggestions: skillsData[skillKey].suggestions.filter(
          (suggestion) =>
            normalizeSkill(suggestion) !== normalizeSkill(trimmedSkill)
        ),
      },
    }

    if (!updatedSkills.id) {
      updatedSkills.id = uuidv4()
    }

    upsertSkills(updatedSkills)

    if (type === SKILL_TYPES.HARD) {
      setHardSkillInput('')
      hardSkillInputRef.current?.focus()
    } else {
      setSoftSkillInput('')
      softSkillInputRef.current?.focus()
    }
  }

  const handleRemoveSkill = (type: SkillType, skill: string): void => {
    const skillKey = type === SKILL_TYPES.HARD ? 'hardSkills' : 'softSkills'
    const updatedSkills: SkillsType = {
      ...skillsData,
      [skillKey]: {
        skills: skillsData[skillKey].skills.filter(
          (existingSkill) => existingSkill !== skill
        ),
        suggestions: skillsData[skillKey].suggestions,
      },
    }
    upsertSkills(updatedSkills)
  }

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: SkillType
  ): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = type === SKILL_TYPES.HARD ? hardSkillInput : softSkillInput
      handleAddSkill(type, value)
    }
  }

  const getDuplicateSkill = (
    input: string,
    skillsList: string[]
  ): string | null => {
    if (!input.trim()) return null
    const normalizedInput = normalizeSkill(input)
    return (
      skillsList.find((skill) => normalizeSkill(skill) === normalizedInput) ||
      null
    )
  }

  const handleInputFocus = (type: SkillType): void => {
    setFocusedInput(type)
  }

  const handleInputBlur = (e: React.FocusEvent): void => {
    const relatedTarget = e.relatedTarget as HTMLElement

    // Check if focus is moving to either suggestions container
    if (
      hardSuggestionsRef.current?.contains(relatedTarget) ||
      softSuggestionsRef.current?.contains(relatedTarget)
    ) {
      return
    }

    setFocusedInput(null)
  }

  const handleSuggestionClick = (
    _type: SkillType,
    _suggestion: string
  ): void => {
    // const skillKey = type === SKILL_TYPES.HARD ? 'hardSkills' : 'softSkills'
    // const updatedSkills: SkillsType = {
    //   ...skillsData,
    //   [skillKey]: {
    //     skills: [...skillsData[skillKey].skills, suggestion],
    //     suggestions: skillsData[skillKey].suggestions.filter(
    //       (item) => normalizeSkill(item) !== normalizeSkill(suggestion)
    //     ),
    //   },
    // }
    // save(updatedSkills)
  }

  const handleSuggestionDelete = (
    _type: SkillType,
    _suggestion: string
  ): void => {
    // const skillKey = type === SKILL_TYPES.HARD ? 'hardSkills' : 'softSkills'
    // const updatedSkills: SkillsType = {
    //   ...skillsData,
    //   [skillKey]: {
    //     suggestions: skillsData[skillKey].suggestions.filter(
    //       (existingSuggestion) => existingSuggestion !== suggestion
    //     ),
    //     skills: skillsData[skillKey].skills,
    //   },
    // }
    // save(updatedSkills)
  }

  const duplicateHardSkill = getDuplicateSkill(
    hardSkillInput,
    skillsData.hardSkills.skills
  )
  const duplicateSoftSkill = getDuplicateSkill(
    softSkillInput,
    skillsData.softSkills.skills
  )

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = resumeSkillsData.findIndex(
          (item) => item.id === active.id
        )
        const newIndex = resumeSkillsData.findIndex(
          (item) => item.id === over.id
        )
        const newOrder = arrayMove(resumeSkillsData, oldIndex, newIndex)
        reorderResumeSkills(newOrder)
      }

      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [resumeSkillsData, reorderResumeSkills]
  )

  const handleAddSkillCategory = (): void => {
    if (temporarySkillCategory) return

    setTemporarySkillCategory({
      id: uuidv4(),
      title: '',
      skills: [],
      isIncluded: true,
    })
  }

  const handleCategoryCreate = useCallback((): void => {
    setTemporarySkillCategory(null)
  }, [])

  const activeItem = useMemo((): JSX.Element | null => {
    if (!activeId) return null

    const draggingBlock = resumeSkillsData.find(
      (skill) => skill.id === activeId
    )
    if (!draggingBlock) return null

    return (
      <DraggableSkillBlock
        id={draggingBlock.id}
        title={draggingBlock.title ?? ''}
        skills={draggingBlock.skills}
        isOverlay={true}
        isDropping={isDropping}
        isIncluded={draggingBlock.isIncluded}
      />
    )
  }, [activeId, isDropping, resumeSkillsData])

  const renderSkillBlocks = (
    resumeSkillsData: SkillBlock[],
    temporaryBlock: SkillBlock | null,
    activeId: string | null,
    isDropping: boolean
  ): JSX.Element => {
    const hasContent = resumeSkillsData.length || temporaryBlock

    return (
      <>
        {resumeSkillsData.length > 0 &&
          resumeSkillsData.map((skill) => (
            <DraggableSkillBlock
              key={skill.id}
              id={skill.id}
              title={skill.title ?? ''}
              skills={skill.skills}
              isOverlay={false}
              isDropping={isDropping && activeId === skill.id}
              isIncluded={skill.isIncluded}
            />
          ))}

        {temporaryBlock && (
          <DraggableSkillBlock
            id={temporaryBlock.id}
            title={temporaryBlock.title ?? ''}
            skills={temporaryBlock.skills}
            isOverlay={false}
            isDropping={isDropping && activeId === temporaryBlock.id}
            isTemporary
            onCategoryCreate={handleCategoryCreate}
          />
        )}

        {!hasContent && (
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>
              Try adding a skill block. You can add a single block and list all
              your skills in it, or you can add multiple blocks, categorize
              them, and organize the skills by category. You can also drag the
              blocks to rearrange them.
            </p>
          </div>
        )}
      </>
    )
  }

  return (
    <div className={styles.skills}>
      <h2 className={styles.formTitle}>Skills</h2>

      <div className={styles.formFieldsContainer}>
        <div className={styles.skillSection}>
          <div
            className={styles.collapsibleHeader}
            onClick={() => setIsHardSkillsExpanded((prev) => !prev)}
          >
            <h3 className={styles.sectionTitle}>Hard Skills</h3>
            {isHardSkillsExpanded ? (
              <FaChevronUp size={14} />
            ) : (
              <FaChevronDown size={14} />
            )}
          </div>

          <div
            className={`${styles.collapsibleContent} ${
              isHardSkillsExpanded ? styles.expanded : ''
            }`}
          >
            <div className={styles.inputWrapper}>
              <Suggestions
                suggestions={skillsData.hardSkills.suggestions}
                show={focusedInput === SKILL_TYPES.HARD}
                ref={hardSuggestionsRef}
                onSuggestionClick={(suggestion) =>
                  handleSuggestionClick(SKILL_TYPES.HARD, suggestion)
                }
                onSuggestionDelete={(suggestion) =>
                  handleSuggestionDelete(SKILL_TYPES.HARD, suggestion)
                }
              />
              <div className={styles.chipInputContainer}>
                <input
                  ref={hardSkillInputRef}
                  type='text'
                  className={styles.formInput}
                  placeholder='e.g., React, Python, AWS...'
                  value={hardSkillInput}
                  onChange={(e) => setHardSkillInput(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, SKILL_TYPES.HARD)}
                  onFocus={() => handleInputFocus(SKILL_TYPES.HARD)}
                  onBlur={handleInputBlur}
                />
                <button
                  type='button'
                  className={styles.chipAddButton}
                  onClick={() =>
                    handleAddSkill(SKILL_TYPES.HARD, hardSkillInput)
                  }
                  disabled={!hardSkillInput.trim() || !!duplicateHardSkill}
                >
                  <FaPlus size={12} />
                </button>
              </div>
            </div>

            <div className={styles.chipsContainer}>
              {skillsData.hardSkills.skills.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyMessage}>
                    Add some technical skills, tools, and technologies. They
                    will show up here.
                  </p>
                </div>
              ) : (
                skillsData.hardSkills.skills.map((skill, index) => (
                  <div
                    key={index}
                    className={`${styles.chip} ${
                      duplicateHardSkill === skill ? styles.duplicate : ''
                    }`}
                  >
                    <span className={styles.skillText}>{skill}</span>
                    <button
                      type='button'
                      className={styles.removeChip}
                      onClick={() => handleRemoveSkill(SKILL_TYPES.HARD, skill)}
                      title='Remove skill'
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.skillSection}>
          <div
            className={styles.collapsibleHeader}
            onClick={() => setIsSoftSkillsExpanded((prev) => !prev)}
          >
            <h3 className={styles.sectionTitle}>Soft Skills</h3>
            {isSoftSkillsExpanded ? (
              <FaChevronUp size={14} />
            ) : (
              <FaChevronDown size={14} />
            )}
          </div>

          <div
            className={`${styles.collapsibleContent} ${
              isSoftSkillsExpanded ? styles.expanded : ''
            }`}
          >
            <div className={styles.inputWrapper}>
              <Suggestions
                suggestions={skillsData.softSkills.suggestions}
                show={focusedInput === SKILL_TYPES.SOFT}
                ref={softSuggestionsRef}
                onSuggestionClick={(suggestion) =>
                  handleSuggestionClick(SKILL_TYPES.SOFT, suggestion)
                }
                onSuggestionDelete={(suggestion) =>
                  handleSuggestionDelete(SKILL_TYPES.SOFT, suggestion)
                }
              />
              <div className={styles.chipInputContainer}>
                <input
                  ref={softSkillInputRef}
                  type='text'
                  className={styles.formInput}
                  placeholder='e.g., Leadership, Communication...'
                  value={softSkillInput}
                  onChange={(e) => setSoftSkillInput(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, SKILL_TYPES.SOFT)}
                  onFocus={() => handleInputFocus(SKILL_TYPES.SOFT)}
                  onBlur={handleInputBlur}
                />
                <button
                  type='button'
                  className={styles.chipAddButton}
                  onClick={() =>
                    handleAddSkill(SKILL_TYPES.SOFT, softSkillInput)
                  }
                  disabled={!softSkillInput.trim() || !!duplicateSoftSkill}
                >
                  <FaPlus size={12} />
                </button>
              </div>
            </div>

            <div className={styles.chipsContainer}>
              {skillsData.softSkills.skills.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyMessage}>
                    Add some interpersonal and communication skills. They will
                    show up here.
                  </p>
                </div>
              ) : (
                skillsData.softSkills.skills.map((skill, index) => (
                  <div
                    key={index}
                    className={`${styles.chip} ${
                      duplicateSoftSkill === skill ? styles.duplicate : ''
                    }`}
                  >
                    <span className={styles.skillText}>{skill}</span>
                    <button
                      type='button'
                      className={styles.removeChip}
                      onClick={() => handleRemoveSkill(SKILL_TYPES.SOFT, skill)}
                      title='Remove skill'
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        className={styles.addSkillCategoryButton}
        onClick={handleAddSkillCategory}
      >
        <FaPlus size={12} />
        Add New Skill Block
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={resumeSkillsData.map((skill) => skill.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.skillBuilderContainer}>
            {renderSkillBlocks(
              resumeSkillsData,
              temporarySkillCategory,
              activeId,
              isDropping
            )}
          </div>
        </SortableContext>

        <DragOverlay>{activeItem}</DragOverlay>
      </DndContext>
    </div>
  )
}

export default Skills
