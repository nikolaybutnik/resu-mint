import styles from './EducationStep.module.scss'
import { useState, useEffect, useActionState } from 'react'
import { MONTHS, EDUCATION_FORM_DATA_KEYS } from '@/lib/constants'
import { submitEducation } from '@/lib/actions/educationActions'
import { DegreeStatus, EducationFormState } from '@/lib/types/education'
import { useAutoResizeTextarea } from '@/lib/hooks/useAutoResizeTextarea'
import { v4 as uuidv4 } from 'uuid'
import { useEducationStore } from '@/stores/educationStore'
import { OperationError } from '@/lib/types/errors'

interface EducationStepProps {
  onContinue: () => void
  onSkip?: () => void
}

export const EducationStep: React.FC<EducationStepProps> = ({
  onContinue,
  onSkip,
}) => {
  // const { upsert: upsertEducation } = useEducationStore()

  const [showForm, setShowForm] = useState(false)
  const [isEditingExisting, setIsEditingExisting] = useState(false)

  const {
    data: educationData,
    hasData,
    // save: saveEducation,
  } = useEducationStore()

  const submitEducationWrapper = async (
    prevState: EducationFormState,
    formData: FormData
  ): Promise<EducationFormState> => {
    let id = prevState.data?.id
    if (!id) {
      id = uuidv4()
    }

    // TODO: implement upsert
    return await submitEducation(
      { ...prevState, data: { ...prevState.data, id, isIncluded: true } },
      formData,
      // upsertEducation // Mocked - would use the upsert function from store
      () => Promise.resolve({ error: null } as { error: OperationError | null })
    )
  }

  const [state, formAction] = useActionState(submitEducationWrapper, {
    fieldErrors: {},
    data: educationData.length > 0 ? educationData[0] : undefined,
  })

  const [description, setDescription] = useState(state.data?.description || '')

  const {
    textareaRef,
    handleChange: handleTextareaChange,
    handleInput,
  } = useAutoResizeTextarea(description)

  useEffect(() => {
    setDescription(state.data?.description || '')
  }, [state.data?.description])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    formAction(formData)
  }

  useEffect(() => {
    if (state.data && Object.keys(state.fieldErrors).length === 0) {
      onContinue()
    }
  }, [state.data, state.fieldErrors, onContinue])

  const renderSelectionPhase = () => {
    if (hasData) {
      return (
        <>
          <p>Great! You&apos;ve added your education details.</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => {
                setShowForm(true)
                setIsEditingExisting(true)
              }}
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
              onClick={() => {
                setShowForm(true)
                setIsEditingExisting(false)
              }}
            >
              Add Education
            </button>
          </div>
          {onSkip && (
            <div className={styles.skipSection}>
              <button
                type='button'
                className={styles.skipButton}
                onClick={onSkip}
              >
                Skip for now
              </button>
            </div>
          )}
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
        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <button
              type='button'
              className={styles.backToChoiceButton}
              onClick={() => {
                setShowForm(false)
                setIsEditingExisting(false)
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
                state?.fieldErrors?.institution ? styles.error : ''
              }`}
              defaultValue={state.data?.institution}
              placeholder='e.g., University of Toronto'
            />
            {state?.fieldErrors?.institution && (
              <span className={styles.formError}>
                {state.fieldErrors.institution}
              </span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Degree</label>
            <input
              type='text'
              name={EDUCATION_FORM_DATA_KEYS.DEGREE}
              className={`${styles.formInput} ${
                state?.fieldErrors?.degree ? styles.error : ''
              }`}
              defaultValue={state.data?.degree}
              placeholder='e.g., Bachelor of Science in Computer Science'
            />
            {state?.fieldErrors?.degree && (
              <span className={styles.formError}>
                {state.fieldErrors.degree}
              </span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Location (Optional)</label>
            <input
              type='text'
              name={EDUCATION_FORM_DATA_KEYS.LOCATION}
              className={`${styles.formInput} ${
                state?.fieldErrors?.location ? styles.error : ''
              }`}
              defaultValue={state.data?.location || ''}
              placeholder='e.g., Toronto, ON'
            />
            {state?.fieldErrors?.location && (
              <span className={styles.formError}>
                {state.fieldErrors.location}
              </span>
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
              {state?.fieldErrors?.startDate && (
                <span className={styles.formError}>
                  {state.fieldErrors.startDate}
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
              {state?.fieldErrors?.endDate && (
                <span className={styles.formError}>
                  {state.fieldErrors.endDate}
                </span>
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
            {state?.fieldErrors?.description && (
              <span className={styles.formError}>
                {state.fieldErrors.description}
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
