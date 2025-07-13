import styles from './EducationStep.module.scss'
import { useState, useEffect, useActionState } from 'react'
import { MONTHS, EDUCATION_FORM_DATA_KEYS } from '@/lib/constants'
import { submitEducation } from '@/lib/actions/educationActions'
import { DegreeStatus, EducationFormState } from '@/lib/types/education'
import { useAutoResizeTextarea } from '@/lib/hooks/useAutoResizeTextarea'
import { v4 as uuidv4 } from 'uuid'
import { useEducationStore } from '@/stores/educationStore'

interface EducationStepProps {
  onContinue: () => void
  onSkip: () => void
}

export const EducationStep: React.FC<EducationStepProps> = ({
  onContinue,
  onSkip,
}) => {
  const {
    data: educationData,
    hasData,
    save: saveEducation,
  } = useEducationStore()

  const submitEducationWrapper = (
    prevState: EducationFormState,
    formData: FormData
  ) => {
    let id = prevState.data?.id
    if (!id) {
      id = uuidv4()
    }

    return submitEducation(
      { ...prevState, data: { ...prevState.data, id, isIncluded: true } },
      formData,
      educationData,
      saveEducation
    )
  }

  const [state, formAction] = useActionState(
    (prevState: EducationFormState, formData: FormData) =>
      submitEducationWrapper(prevState, formData),
    {
      errors: {},
      data: educationData,
    } as EducationFormState
  )

  useEffect(() => {
    if (state.success) {
      onContinue()
    }
  }, [state.success, onContinue])

  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState(state.data?.description || '')

  const {
    textareaRef,
    handleChange: handleTextareaChange,
    handleInput,
  } = useAutoResizeTextarea(description)

  useEffect(() => {
    setDescription(state.data?.description || '')
  }, [state.data?.description])

  const handleEditEducation = () => {
    const [storedData] = educationData

    const loadFormData = new FormData()
    loadFormData.set('load', 'true')
    loadFormData.set('existingData', JSON.stringify(storedData))

    formAction(loadFormData)

    setShowForm(true)
  }

  const renderSelectionPhase = () => {
    if (hasData) {
      return (
        <>
          <p>Great! You&apos;ve added your education details.</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={handleEditEducation}
            >
              Edit Education
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
          <p>Add your educational background:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => setShowForm(true)}
            >
              Add Education
            </button>
          </div>
          <div className={styles.skipSection}>
            <button
              type='button'
              className={styles.skipButton}
              onClick={onSkip}
            >
              Skip for now
            </button>
          </div>
        </>
      )
    }
  }

  return (
    <div className={styles.educationForm}>
      {!showForm ? (
        <div className={styles.placeholderContent}>
          {renderSelectionPhase()}
        </div>
      ) : (
        <form action={formAction}>
          <div className={styles.formField}>
            <button
              type='button'
              className={styles.backToChoiceButton}
              onClick={() => {
                setShowForm(false)
                // setIsEditingExisting(false)
              }}
            >
              ← Back to selection
            </button>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Institution</label>
            <input
              type='text'
              name={EDUCATION_FORM_DATA_KEYS.INSTITUTION}
              className={`${styles.formInput} ${
                state?.errors?.institution ? styles.error : ''
              }`}
              defaultValue={state.data?.institution}
              placeholder='e.g., University of Toronto'
            />
            {state?.errors?.institution && (
              <span className={styles.formError}>
                {state.errors.institution}
              </span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Degree</label>
            <input
              type='text'
              name={EDUCATION_FORM_DATA_KEYS.DEGREE}
              className={`${styles.formInput} ${
                state?.errors?.degree ? styles.error : ''
              }`}
              defaultValue={state.data?.degree}
              placeholder='e.g., Bachelor of Science in Computer Science'
            />
            {state?.errors?.degree && (
              <span className={styles.formError}>{state.errors.degree}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Location (Optional)</label>
            <input
              type='text'
              name={EDUCATION_FORM_DATA_KEYS.LOCATION}
              className={`${styles.formInput} ${
                state?.errors?.location ? styles.error : ''
              }`}
              defaultValue={state.data?.location || ''}
              placeholder='e.g., Toronto, ON'
            />
            {state?.errors?.location && (
              <span className={styles.formError}>{state.errors.location}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Status (Optional)</label>
            <select
              key={state.data?.degreeStatus}
              name={EDUCATION_FORM_DATA_KEYS.DEGREE_STATUS}
              className={styles.formInput}
              defaultValue={state.data?.degreeStatus || ''}
            >
              <option value=''>Select status</option>
              <option value={DegreeStatus.COMPLETED}>Completed</option>
              <option value={DegreeStatus.IN_PROGRESS}>In Progress</option>
            </select>
          </div>

          <div className={styles.dateRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Start Date (Optional)</label>
              <div className={styles.dateInputs}>
                <select
                  key={state.data?.startDate?.month}
                  name={EDUCATION_FORM_DATA_KEYS.START_DATE_MONTH}
                  className={[styles.formInput, styles.monthInput].join(' ')}
                  defaultValue={state.data?.startDate?.month || ''}
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
                  name={EDUCATION_FORM_DATA_KEYS.START_DATE_YEAR}
                  placeholder='YYYY'
                  className={[styles.formInput, styles.yearInput].join(' ')}
                  defaultValue={state.data?.startDate?.year || ''}
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
              {state?.errors?.startDate && (
                <span className={styles.formError}>
                  {state.errors.startDate}
                </span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>End Date (Optional)</label>
              <div className={styles.dateInputs}>
                <select
                  key={state.data?.endDate?.month}
                  name={EDUCATION_FORM_DATA_KEYS.END_DATE_MONTH}
                  className={[styles.formInput, styles.monthInput].join(' ')}
                  defaultValue={state.data?.endDate?.month || ''}
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
                  name={EDUCATION_FORM_DATA_KEYS.END_DATE_YEAR}
                  placeholder='YYYY'
                  className={[styles.formInput, styles.yearInput].join(' ')}
                  defaultValue={state.data?.endDate?.year || ''}
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
              {state?.errors?.endDate && (
                <span className={styles.formError}>{state.errors.endDate}</span>
              )}
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Description (Optional)</label>
            <textarea
              ref={textareaRef}
              name={EDUCATION_FORM_DATA_KEYS.DESCRIPTION}
              className={styles.formTextarea}
              value={description}
              rows={4}
              placeholder={
                'Describe your curriculum, projects, achievements, etc. This is optional but if entered, the AI will be able to more effectively optimize and tailor the resume content.'
              }
              onChange={(e) => {
                const newValue = handleTextareaChange(e)
                setDescription(newValue)
              }}
              onInput={handleInput}
            />
            {state?.errors?.description && (
              <span className={styles.formError}>
                {state.errors.description}
              </span>
            )}
          </div>

          <button type='submit' className={styles.submitButton}>
            {/* {isEditingExisting ? 'Update & Continue' : 'Continue'} */}
            Continue
          </button>
        </form>
      )}
    </div>
  )
}
