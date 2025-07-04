import styles from './Skills.module.scss'
import { useState, useCallback, useRef, useEffect } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'

interface SkillsData {
  hardSkills: string[]
  softSkills: string[]
}

interface SkillsProps {
  data: SkillsData
  loading: boolean
  onSave: (data: SkillsData) => void
}

const Skills: React.FC<SkillsProps> = ({ data, loading, onSave }) => {
  const hardSkillInputRef = useRef<HTMLInputElement>(null)
  const softSkillInputRef = useRef<HTMLInputElement>(null)

  const [localData, setLocalData] = useState<SkillsData>(data)
  const [hardSkillInput, setHardSkillInput] = useState('')
  const [softSkillInput, setSoftSkillInput] = useState('')

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const normalizeSkill = (skill: string): string => {
    return skill.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  const handleAddSkill = useCallback(
    (type: 'hard' | 'soft', skill: string) => {
      const trimmedSkill = skill.trim()
      if (!trimmedSkill) return

      const skillKey = type === 'hard' ? 'hardSkills' : 'softSkills'

      const isDuplicate = localData[skillKey].some(
        (existingSkill) =>
          normalizeSkill(existingSkill) === normalizeSkill(trimmedSkill)
      )
      if (isDuplicate) return

      const updatedData = {
        ...localData,
        [skillKey]: [...localData[skillKey], trimmedSkill],
      }

      setLocalData(updatedData)
      onSave(updatedData)

      if (type === 'hard') {
        setHardSkillInput('')
        hardSkillInputRef.current?.focus()
      } else {
        setSoftSkillInput('')
        softSkillInputRef.current?.focus()
      }
    },
    [localData, onSave]
  )

  const handleRemoveSkill = useCallback(
    (type: 'hard' | 'soft', skillToRemove: string) => {
      const skillKey = type === 'hard' ? 'hardSkills' : 'softSkills'
      const updatedData = {
        ...localData,
        [skillKey]: localData[skillKey].filter(
          (skill) => skill !== skillToRemove
        ),
      }

      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, type: 'hard' | 'soft') => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const value = type === 'hard' ? hardSkillInput : softSkillInput
        handleAddSkill(type, value)
      }
    },
    [hardSkillInput, softSkillInput, handleAddSkill]
  )

  const isHardSkillDuplicate =
    hardSkillInput.trim() !== '' &&
    localData.hardSkills.some(
      (skill) => normalizeSkill(skill) === normalizeSkill(hardSkillInput)
    )

  const isSoftSkillDuplicate =
    softSkillInput.trim() !== '' &&
    localData.softSkills.some(
      (skill) => normalizeSkill(skill) === normalizeSkill(softSkillInput)
    )

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
    localData.hardSkills
  )
  const duplicateSoftSkill = getDuplicateSkill(
    softSkillInput,
    localData.softSkills
  )

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your skills...' size='lg' />
      ) : (
        <div className={styles.skills}>
          <h2 className={styles.formTitle}>Skills</h2>

          <div className={styles.formFieldsContainer}>
            <div className={styles.skillSection}>
              <h3 className={styles.sectionTitle}>Technical Skills</h3>
              <div className={styles.chipInputContainer}>
                <input
                  ref={hardSkillInputRef}
                  type='text'
                  className={styles.formInput}
                  placeholder='E.g., React, Python, AWS...'
                  value={hardSkillInput}
                  onChange={(e) => setHardSkillInput(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 'hard')}
                />
                <button
                  type='button'
                  className={styles.chipAddButton}
                  onClick={() => handleAddSkill('hard', hardSkillInput)}
                  disabled={!hardSkillInput.trim() || isHardSkillDuplicate}
                >
                  <FaPlus size={12} />
                </button>
              </div>

              <div className={styles.chipsContainer}>
                {localData.hardSkills.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyMessage}>
                      Technical skills will be auto-populated when you add work
                      experience or projects, or you can add them manually
                      above.
                    </p>
                  </div>
                ) : (
                  localData.hardSkills.map((skill, index) => (
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
                        onClick={() => handleRemoveSkill('hard', skill)}
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
                  placeholder='E.g., Leadership, Communication...'
                  value={softSkillInput}
                  onChange={(e) => setSoftSkillInput(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 'soft')}
                />
                <button
                  type='button'
                  className={styles.chipAddButton}
                  onClick={() => handleAddSkill('soft', softSkillInput)}
                  disabled={!softSkillInput.trim() || isSoftSkillDuplicate}
                >
                  <FaPlus size={12} />
                </button>
              </div>
              <div className={styles.chipsContainer}>
                {localData.softSkills.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyMessage}>
                      Soft skills will be auto-populated when you add work
                      experience or projects, or you can add them manually
                      above.
                    </p>
                  </div>
                ) : (
                  localData.softSkills.map((skill, index) => (
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
                        onClick={() => handleRemoveSkill('soft', skill)}
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
      )}
    </>
  )
}

export default Skills
