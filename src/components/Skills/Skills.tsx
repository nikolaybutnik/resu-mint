import styles from './Skills.module.scss'
import { useState, useRef, useCallback, useMemo } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
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

const Skills: React.FC = () => {
  const {
    data: skillsData,
    save,
    resumeSkillData,
    saveResumeSkillsData,
  } = useSkillsStore()

  const hardSkillInputRef = useRef<HTMLInputElement>(null)
  const softSkillInputRef = useRef<HTMLInputElement>(null)
  const hardSuggestionsRef = useRef<HTMLDivElement>(null)
  const softSuggestionsRef = useRef<HTMLDivElement>(null)

  const [hardSkillInput, setHardSkillInput] = useState('')
  const [softSkillInput, setSoftSkillInput] = useState('')
  const [focusedInput, setFocusedInput] = useState<SkillType | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)
  const [temporarySkillCategory, setTemporarySkillCategory] =
    useState<SkillBlock | null>(null)

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

    save(updatedSkills)

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

    save(updatedSkills)
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

  const handleSuggestionClick = (type: SkillType, suggestion: string): void => {
    const skillKey = type === SKILL_TYPES.HARD ? 'hardSkills' : 'softSkills'
    const updatedSkills: SkillsType = {
      ...skillsData,
      [skillKey]: {
        skills: [...skillsData[skillKey].skills, suggestion],
        suggestions: skillsData[skillKey].suggestions.filter(
          (item) => normalizeSkill(item) !== normalizeSkill(suggestion)
        ),
      },
    }

    save(updatedSkills)
  }

  const handleSuggestionDelete = (
    type: SkillType,
    suggestion: string
  ): void => {
    const skillKey = type === SKILL_TYPES.HARD ? 'hardSkills' : 'softSkills'
    const updatedSkills: SkillsType = {
      ...skillsData,
      [skillKey]: {
        suggestions: skillsData[skillKey].suggestions.filter(
          (existingSuggestion) => existingSuggestion !== suggestion
        ),
        skills: skillsData[skillKey].skills,
      },
    }

    save(updatedSkills)
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
        const oldIndex = resumeSkillData.findIndex(
          (item) => item.id === active.id
        )
        const newIndex = resumeSkillData.findIndex(
          (item) => item.id === over.id
        )
        const newOrder = arrayMove(resumeSkillData, oldIndex, newIndex)

        saveResumeSkillsData(newOrder)
      }

      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [resumeSkillData, saveResumeSkillsData]
  )

  const handleAddSkillCategory = (): void => {
    if (temporarySkillCategory) return

    setTemporarySkillCategory({
      id: uuidv4(),
      title: '',
      skills: [],
    })
  }

  const draggableBlocks = useMemo(
    () =>
      resumeSkillData.map((skill) => (
        <DraggableSkillBlock
          key={skill.id}
          id={skill.id}
          title={skill.title ?? ''}
          skills={skill.skills}
          isOverlay={false}
          isDropping={isDropping}
        />
      )),
    [resumeSkillData, isDropping]
  )

  const activeItem = useMemo(() => {
    const draggingBlock = resumeSkillData.find((skill) => skill.id === activeId)
    if (!draggingBlock) return null

    return (
      <DraggableSkillBlock
        id={draggingBlock.id}
        title={draggingBlock.title ?? ''}
        skills={draggingBlock.skills}
        isOverlay={true}
        isDropping={isDropping}
      />
    )
  }, [activeId, resumeSkillData, isDropping])

  return (
    <div className={styles.skills}>
      <h2 className={styles.formTitle}>Skills</h2>

      <div className={styles.formFieldsContainer}>
        <div className={styles.skillSection}>
          <h3 className={styles.sectionTitle}>Hard Skills</h3>
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
                onClick={() => handleAddSkill(SKILL_TYPES.HARD, hardSkillInput)}
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
                  Hard skills you&apos;ve added will be displayed here.
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

        <div className={styles.skillSection}>
          <h3 className={styles.sectionTitle}>Soft Skills</h3>
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
                onClick={() => handleAddSkill(SKILL_TYPES.SOFT, softSkillInput)}
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
                  Soft skills you&apos;ve added will be displayed here.
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

      <button
        className={styles.addSkillCategoryButton}
        onClick={handleAddSkillCategory}
      >
        Add New Skill Category
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={resumeSkillData.map((skill) => skill.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.skillBuilderContainer}>
            {draggableBlocks}

            {temporarySkillCategory && (
              <DraggableSkillBlock
                id={temporarySkillCategory.id}
                title={temporarySkillCategory.title ?? ''}
                skills={temporarySkillCategory.skills}
                isOverlay={false}
                isDropping={isDropping}
                isTemporary
                onCategoryCreate={() => {
                  setTemporarySkillCategory(null)
                }}
              />
            )}
          </div>
        </SortableContext>

        <DragOverlay>{activeItem}</DragOverlay>
      </DndContext>
    </div>
  )
}

export default Skills
