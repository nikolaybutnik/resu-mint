import styles from './Skills.module.scss'
import { useState, useRef } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import { useSkillsStore } from '@/stores/skillsStore'
import {
  SKILL_TYPES,
  SkillType,
  Skills as SkillsType,
} from '@/lib/types/skills'

const Skills: React.FC = () => {
  const { data: skillsData, save } = useSkillsStore()

  const hardSkillInputRef = useRef<HTMLInputElement>(null)
  const softSkillInputRef = useRef<HTMLInputElement>(null)

  const [hardSkillInput, setHardSkillInput] = useState('')
  const [softSkillInput, setSoftSkillInput] = useState('')

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
  ) => {
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
          <div className={styles.chipInputContainer}>
            <input
              ref={hardSkillInputRef}
              type='text'
              className={styles.formInput}
              placeholder='e.g., React, Python, AWS...'
              value={hardSkillInput}
              onChange={(e) => setHardSkillInput(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, SKILL_TYPES.HARD)}
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
          <div className={styles.chipInputContainer}>
            <input
              ref={softSkillInputRef}
              type='text'
              className={styles.formInput}
              placeholder='e.g., Leadership, Communication...'
              value={softSkillInput}
              onChange={(e) => setSoftSkillInput(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, SKILL_TYPES.SOFT)}
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
