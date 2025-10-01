import styles from './EditableEducationBlock.module.scss'
import React, { useState, useEffect, useActionState } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { EDUCATION_FORM_DATA_KEYS, MONTHS } from '@/lib/constants'
import {
  EducationBlockData,
  DegreeStatus,
  EducationFormState,
} from '@/lib/types/education'
import { useAutoResizeTextarea } from '@/lib/hooks'
import { useEducationStore } from '@/stores'
import { submitEducation } from '@/lib/actions/educationActions'
import { useFormStatus } from 'react-dom'
import { OperationError } from '@/lib/types/errors'

interface EditableEducationBlockProps {
  data: EducationBlockData
  onClose: (() => void) | undefined
}

const EditableEducationBlock: React.FC<EditableEducationBlockProps> = ({
  data,
  onClose,
}) => {
  const {
    data: educationData,
    // upsert,
    hasChanges,
  } = useEducationStore()

  const isNew = !educationData.some((block) => block.id === data.id)
  const shouldShowCloseButton = educationData.length > 1 || !isNew

  const [state, formAction] = useActionState(
    (
      prevState: EducationFormState,
      formData: FormData
    ): Promise<EducationFormState> =>
      // TODO: implement upsert
      submitEducation(prevState, formData, () =>
        Promise.resolve({ error: null } as { error: OperationError | null })
      ) as Promise<EducationFormState>,
    {
      fieldErrors: {},
      data,
    } as EducationFormState
  )

  const updatedEducationData = educationData.map((block) =>
    block.id === data.id
      ? state.data
        ? { ...data, ...state.data }
        : data
      : block
  )
  const currentFormHasChanges = hasChanges(updatedEducationData)

  const [description, setDescription] = useState(state.data?.description || '')

  useEffect(() => {
    setDescription(state.data?.description || '')
  }, [state.data?.description])

  const {
    textareaRef,
    handleChange: handleTextareaChange,
    handleInput,
  } = useAutoResizeTextarea(description)

  const handleDelete = (): void => {
    if (
      window.confirm(
        'Are you sure you want to delete this education? This action cannot be undone.'
      )
    ) {
      // const updatedSections = educationData.filter(
      //   (section) => section.id !== data.id
      // )
      // TODO: implement delete
      // save(updatedSections)
      // onClose?.()
    }
  }

  const SubmitButton: React.FC<{ hasChanges: boolean }> = ({ hasChanges }) => {
    const { pending } = useFormStatus()

    const shouldDisable = hasChanges && pending

    return (
      <button
        type='submit'
        className={styles.saveButton}
        disabled={shouldDisable}
      >
        Save
      </button>
    )
  }

  return (
    <section className={styles.editableEducationBlock}>
      <div className={styles.header}>
        {!isNew && (
          <button
            type='button'
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
        {shouldShowCloseButton && onClose && (
          <button
            type='button'
            className={styles.closeButton}
            onClick={onClose}
          >
            <FaXmark />
          </button>
        )}
      </div>

      <div className={styles.requiredFieldsNote}>
        <span className={styles.requiredIndicator}>*</span>
        Indicates a required field
      </div>

      <form action={formAction} className={styles.educationDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Institution
          </label>
          <input
            type='text'
            name={EDUCATION_FORM_DATA_KEYS.INSTITUTION}
            className={`${styles.formInput} ${
              state?.fieldErrors?.institution ? styles.error : ''
            }`}
            defaultValue={state.data?.institution}
            placeholder='e.g. Harvard University'
          />
          {state?.fieldErrors?.institution && (
            <span className={styles.formError}>
              {state.fieldErrors.institution}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Degree
          </label>
          <input
            type='text'
            name={EDUCATION_FORM_DATA_KEYS.DEGREE}
            className={`${styles.formInput} ${
              state?.fieldErrors?.degree ? styles.error : ''
            }`}
            defaultValue={state.data?.degree}
            placeholder='e.g. Bachelor of Computer Science'
          />
          {state?.fieldErrors?.degree && (
            <span className={styles.formError}>{state.fieldErrors.degree}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Degree Status</label>
          <select
            key={`${state.data?.degreeStatus}-${state.data?.id}`}
            name={EDUCATION_FORM_DATA_KEYS.DEGREE_STATUS}
            className={styles.formInput}
            defaultValue={state.data?.degreeStatus || ''}
          >
            <option value=''>Select Option</option>
            <option value={DegreeStatus.COMPLETED}>Completed</option>
            <option value={DegreeStatus.IN_PROGRESS}>In Progress</option>
          </select>
          {state?.fieldErrors?.degreeStatus && (
            <span className={styles.formError}>
              {state.fieldErrors.degreeStatus}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Location</label>
          <input
            type='text'
            name={EDUCATION_FORM_DATA_KEYS.LOCATION}
            className={`${styles.formInput} ${
              state?.fieldErrors?.location ? styles.error : ''
            }`}
            defaultValue={state.data?.location || ''}
            placeholder='e.g. Cambridge, MA'
          />
          {state?.fieldErrors?.location && (
            <span className={styles.formError}>
              {state.fieldErrors.location}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Start Date</label>
          <div className={styles.dateInputs}>
            <select
              key={state.data?.startDate?.month}
              className={[styles.formInput, styles.monthInput].join(' ')}
              defaultValue={state.data?.startDate?.month || ''}
              name={EDUCATION_FORM_DATA_KEYS.START_DATE_MONTH}
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
              className={`${styles.formInput} ${styles.yearInput}`}
              placeholder='YYYY'
              defaultValue={state.data?.startDate?.year || ''}
              name={EDUCATION_FORM_DATA_KEYS.START_DATE_YEAR}
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
          <label className={styles.label}>End Date</label>
          <div className={styles.dateInputs}>
            <select
              key={state.data?.endDate?.month}
              className={`${styles.formInput} ${styles.monthInput}`}
              defaultValue={state.data?.endDate?.month || ''}
              name={EDUCATION_FORM_DATA_KEYS.END_DATE_MONTH}
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
              className={`${styles.formInput} ${styles.yearInput}`}
              placeholder='YYYY'
              defaultValue={state.data?.endDate?.year || ''}
              name={EDUCATION_FORM_DATA_KEYS.END_DATE_YEAR}
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

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            ref={textareaRef}
            name={EDUCATION_FORM_DATA_KEYS.DESCRIPTION}
            className={styles.formTextarea}
            value={description}
            rows={4}
            placeholder='Describe your education experience, achievements, relevant coursework, etc.'
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

        <div className={styles.actionButtons}>
          <SubmitButton hasChanges={currentFormHasChanges} />
        </div>
      </form>
    </section>
  )
}

export default React.memo(EditableEducationBlock)
