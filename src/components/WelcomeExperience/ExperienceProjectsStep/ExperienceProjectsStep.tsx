import styles from './ExperienceProjectsStep.module.scss'
import { useState, useEffect, useActionState } from 'react'
import { MONTHS, STORAGE_KEYS } from '@/lib/constants'
import {
  submitExperienceProject,
  experienceProjectInitialState,
} from '@/lib/actions/experienceProjectActions'
import { EXPERIENCE_FORM_DATA_KEYS } from '@/lib/constants'
import { useAutoResizeTextarea } from '@/lib/hooks/useAutoResizeTextarea'
import {
  FormSelectionState,
  StoredDataItem,
} from '@/lib/actions/experienceProjectActions'

interface ExperienceProjectsStepProps {
  onContinue: () => void
}

export const ExperienceProjectsStep: React.FC<ExperienceProjectsStepProps> = ({
  onContinue,
}) => {
  const [selectedOption, setSelectedOption] = useState<
    keyof typeof FormSelectionState | null
  >(null)
  const [isEditingExisting, setIsEditingExisting] = useState(false)

  const [formState, formAction] = useActionState(
    submitExperienceProject,
    experienceProjectInitialState
  )

  const [isCurrent, setIsCurrent] = useState(
    formState.data?.endDate?.isPresent || false
  )
  const [description, setDescription] = useState(
    formState.data?.description || ''
  )

  const {
    textareaRef,
    handleChange: handleTextareaChange,
    handleInput,
  } = useAutoResizeTextarea(description)

  useEffect(() => {
    setIsCurrent(formState.data?.endDate?.isPresent || false)
    setDescription(formState.data?.description || '')
  }, [formState.data?.endDate?.isPresent, formState.data?.description])

  useEffect(() => {
    const resetFormData = new FormData()
    resetFormData.set('type', selectedOption || 'reset')
    resetFormData.set('reset', 'true')
    formAction(resetFormData)
    setIsEditingExisting(false)
  }, [selectedOption, formAction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOption) return

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    formData.append('type', selectedOption)

    formAction(formData)
  }

  const handleDiscardAndReplace = () => {
    setSelectedOption(null)
  }

  const handleOptionSelect = (option: keyof typeof FormSelectionState) => {
    const storageKey =
      option === FormSelectionState.experience
        ? STORAGE_KEYS.EXPERIENCE
        : STORAGE_KEYS.PROJECTS
    const existingData = localStorage.getItem(storageKey)
    const hasExistingData = existingData && JSON.parse(existingData).length > 0

    setSelectedOption(option)

    if (hasExistingData) {
      const parsedData = JSON.parse(existingData) as StoredDataItem[]
      const latestEntry = parsedData[parsedData.length - 1]

      // Timeout to ensure reset completes first
      setTimeout(() => {
        const loadFormData = new FormData()
        loadFormData.set('type', option)
        loadFormData.set('load', 'true')
        loadFormData.set('existingData', JSON.stringify(latestEntry))
        formAction(loadFormData)
        setIsEditingExisting(true)
      }, 50)
    }
  }

  useEffect(() => {
    if (formState.success) {
      onContinue()
    }
  }, [formState.success, onContinue])

  const renderSelectionPhase = () => {
    const experienceData = localStorage.getItem(STORAGE_KEYS.EXPERIENCE)
    const projectData = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    const hasExperience = experienceData
      ? (JSON.parse(experienceData) as StoredDataItem[]).length > 0
      : false
    const hasProject = projectData
      ? (JSON.parse(projectData) as StoredDataItem[]).length > 0
      : false

    if (hasExperience && hasProject) {
      return (
        <>
          <p>Great! You&apos;ve added both experience and project.</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.experience)}
            >
              Edit Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.project)}
            >
              Edit Personal Project
            </button>
          </div>
          <button
            type='button'
            className={styles.submitButton}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      )
    } else if (hasExperience) {
      return (
        <>
          <p>You&apos;ve added work experience. You can also add a project:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.experience)}
            >
              Edit Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.project)}
            >
              Add Personal Project
            </button>
          </div>
          <button
            type='button'
            className={styles.submitButton}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      )
    } else if (hasProject) {
      return (
        <>
          <p>You&apos;ve added a project. You can also add work experience:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.experience)}
            >
              Add Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.project)}
            >
              Edit Personal Project
            </button>
          </div>
          <button
            type='button'
            className={styles.submitButton}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      )
    } else {
      return (
        <>
          <p>Choose what you&apos;d like to add:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.experience)}
            >
              Add Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect(FormSelectionState.project)}
            >
              Add Personal Project
            </button>
          </div>
        </>
      )
    }
  }

  return (
    <div className={styles.experienceProjectsForm}>
      {!selectedOption ? (
        <div className={styles.placeholderContent}>
          {renderSelectionPhase()}
        </div>
      ) : (
        <form onSubmit={handleSubmit} key={`form-${selectedOption}`}>
          <div className={styles.formField}>
            <button
              type='button'
              className={styles.backToChoiceButton}
              onClick={handleDiscardAndReplace}
            >
              ← Back to selection
            </button>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>
              {selectedOption === FormSelectionState.experience
                ? 'Job Title'
                : 'Project Title'}
            </label>
            <input
              type='text'
              name={EXPERIENCE_FORM_DATA_KEYS.TITLE}
              key={`title-${selectedOption}`}
              className={`${styles.formInput} ${
                formState.errors.title ? styles.error : ''
              }`}
              defaultValue={formState.data?.title || ''}
              placeholder={
                selectedOption === FormSelectionState.experience
                  ? 'e.g., Software Engineer'
                  : 'e.g., Personal Website'
              }
            />
            {formState.errors.title && (
              <span className={styles.formError}>{formState.errors.title}</span>
            )}
          </div>

          {selectedOption === FormSelectionState.experience && (
            <>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Company</label>
                <input
                  type='text'
                  name={EXPERIENCE_FORM_DATA_KEYS.COMPANY_NAME}
                  key={`companyName-${selectedOption}`}
                  className={`${styles.formInput} ${
                    formState.errors.companyName ? styles.error : ''
                  }`}
                  defaultValue={formState.data?.companyName || ''}
                  placeholder='e.g., Google'
                />
                {formState.errors.companyName && (
                  <span className={styles.formError}>
                    {formState.errors.companyName}
                  </span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Location</label>
                <input
                  type='text'
                  name={EXPERIENCE_FORM_DATA_KEYS.LOCATION}
                  key={`location-${selectedOption}`}
                  className={`${styles.formInput} ${
                    formState.errors.location ? styles.error : ''
                  }`}
                  defaultValue={formState.data?.location || ''}
                  placeholder='e.g., San Francisco, CA'
                />
                {formState.errors.location && (
                  <span className={styles.formError}>
                    {formState.errors.location}
                  </span>
                )}
              </div>
            </>
          )}

          <div className={styles.dateRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Start Date</label>
              <div className={styles.dateInputs}>
                <select
                  key={formState.data?.startDate?.month}
                  name={EXPERIENCE_FORM_DATA_KEYS.START_DATE_MONTH}
                  className={[styles.formInput, styles.monthInput].join(' ')}
                  defaultValue={formState.data?.startDate?.month || ''}
                >
                  <option value=''>Month</option>
                  {MONTHS.map((month) => (
                    <option key={month.label} value={month.label}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <input
                  type='text'
                  name={EXPERIENCE_FORM_DATA_KEYS.START_DATE_YEAR}
                  placeholder='YYYY'
                  className={[styles.formInput, styles.yearInput].join(' ')}
                  defaultValue={formState.data?.startDate?.year || ''}
                  maxLength={4}
                  onInput={(e) => {
                    const value = e.currentTarget.value
                    if (!/^\d{0,4}$/.test(value)) {
                      e.currentTarget.value = value
                        .replace(/[^0-9]/g, '')
                        .slice(0, 4)
                    }
                  }}
                />
              </div>
              {formState.errors?.startDate && (
                <span className={styles.formError}>
                  {formState.errors.startDate}
                </span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>End Date</label>
              <div className={styles.dateInputs}>
                <select
                  key={formState.data?.endDate?.month}
                  name={EXPERIENCE_FORM_DATA_KEYS.END_DATE_MONTH}
                  className={[styles.formInput, styles.monthInput].join(' ')}
                  defaultValue={formState.data?.endDate?.month || ''}
                  disabled={isCurrent}
                >
                  <option value=''>Month</option>
                  {MONTHS.map((month) => (
                    <option key={month.label} value={month.label}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <input
                  type='text'
                  name={EXPERIENCE_FORM_DATA_KEYS.END_DATE_YEAR}
                  placeholder='YYYY'
                  className={[styles.formInput, styles.yearInput].join(' ')}
                  defaultValue={formState.data?.endDate?.year || ''}
                  disabled={isCurrent}
                  maxLength={4}
                  onInput={(e) => {
                    const value = e.currentTarget.value
                    if (!/^\d{0,4}$/.test(value)) {
                      e.currentTarget.value = value
                        .replace(/[^0-9]/g, '')
                        .slice(0, 4)
                    }
                  }}
                />
              </div>
              <div className={styles.presentCheckbox}>
                <input
                  type='checkbox'
                  name={EXPERIENCE_FORM_DATA_KEYS.END_DATE_IS_PRESENT}
                  value='true'
                  defaultChecked={formState.data?.endDate?.isPresent || false}
                  key={`checkbox-${formState.data?.endDate?.isPresent}`}
                  onChange={(e) => {
                    setIsCurrent(e.target.checked)
                  }}
                />
                <label htmlFor='isPresent' className={styles.checkboxLabel}>
                  {selectedOption === FormSelectionState.experience
                    ? 'Currently working here'
                    : 'Currently working on this'}
                </label>
              </div>
              {formState.errors?.endDate && (
                <span className={styles.formError}>
                  {formState.errors.endDate}
                </span>
              )}
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Description (Optional)</label>
            <textarea
              ref={textareaRef}
              name={EXPERIENCE_FORM_DATA_KEYS.DESCRIPTION}
              className={styles.formTextarea}
              value={description}
              rows={4}
              placeholder={
                selectedOption === FormSelectionState.experience
                  ? 'Describe your role and responsibilities, what you did, what technologies you used, etc. This is optional but if entered, the AI will be able to more effectively optimize and tailor the resume content.'
                  : 'Describe your project, what you did, what technologies you used, etc. This is optional but if entered, the AI will be able to more effectively optimize and tailor the resume content.'
              }
              onChange={(e) => {
                const newValue = handleTextareaChange(e)
                setDescription(newValue)
              }}
              onInput={handleInput}
            />
            {formState.errors?.description && (
              <span className={styles.formError}>
                {formState.errors.description}
              </span>
            )}
          </div>

          <button type='submit' className={styles.submitButton}>
            {isEditingExisting ? 'Update & Continue' : 'Continue'}
          </button>
        </form>
      )}
    </div>
  )
}
