import styles from './Skills.module.scss'
import { useState, useRef } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import { useSkillsStore } from '@/stores/skillsStore'
import {
  SKILL_TYPES,
  SkillType,
  Skills as SkillsType,
} from '@/lib/types/skills'
import Suggestions from './Suggestions/Suggestions'

const Skills: React.FC = () => {
  const { data: skillsData, save } = useSkillsStore()

  const hardSkillInputRef = useRef<HTMLInputElement>(null)
  const softSkillInputRef = useRef<HTMLInputElement>(null)
  const hardSuggestionsRef = useRef<HTMLDivElement>(null)
  const softSuggestionsRef = useRef<HTMLDivElement>(null)

  const [hardSkillInput, setHardSkillInput] = useState('')
  const [softSkillInput, setSoftSkillInput] = useState('')
  const [focusedInput, setFocusedInput] = useState<SkillType | null>(null)

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
        suggestions: skillsData[skillKey].suggestions,
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
    </div>
  )
}

export default Skills
