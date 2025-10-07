import styles from './EditableEducationBlock.module.scss'
import React, { useState, useEffect, useActionState, useRef } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { EDUCATION_FORM_DATA_KEYS, FORM_IDS, MONTHS } from '@/lib/constants'
import {
  EducationBlockData,
  DegreeStatus,
  EducationFormState,
} from '@/lib/types/education'
import { useAutoResizeTextarea } from '@/lib/hooks'
import { useEducationStore, confirm } from '@/stores'
import { submitEducation } from '@/lib/actions/educationActions'
import { useFormStatus } from 'react-dom'
import { extractEducationFormData } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

interface EditableEducationBlockProps {
  data: EducationBlockData
  onClose: (() => void) | undefined
}

const EditableEducationBlock: React.FC<EditableEducationBlockProps> = ({
  data,
  onClose,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null)

  const {
    data: educationData,
    error: storeError,
    delete: deleteEducation,
    upsert,
    hasBlockChanges,
    clearError,
  } = useEducationStore()

  const isNew = !educationData.some((block) => block.id === data.id)
  const shouldShowCloseButton = educationData.length > 1 || !isNew

  const [state, formAction] = useActionState(
    async (
      prevState: EducationFormState,
      formData: FormData
    ): Promise<EducationFormState> => {
      const formEducationData = extractEducationFormData(formData)
      const hasChanges = hasBlockChanges(data.id, formEducationData)

      if (!hasChanges) {
        toast.info("You haven't made any changes to your education.")
        return {
          fieldErrors: {},
          data: formEducationData,
        }
      }

      const result = await submitEducation(prevState, formData, upsert)

      if (Object.keys(result.fieldErrors).length === 0 && result.data) {
        toast.success('Your education was updated.')
      }

      return result
    },
    {
      fieldErrors: {},
      data,
    } as EducationFormState
  )

  const [description, setDescription] = useState(state.data?.description || '')

  useEffect(() => {
    if (storeError) {
      switch (storeError.code) {
        case 'NETWORK_ERROR':
          toast.error(
            'Network connection failed. Please check your internet connection.'
          )
          break
        case 'UNKNOWN_ERROR':
          toast.error('An unexpected error occurred. Please try again.')
          break
        case 'VALIDATION_ERROR':
          toast.error('Invalid data provided. Please check your input.')
          break
        default:
          toast.error('Failed to save your changes. Please try again.')
      }
      clearError()
    }
  }, [storeError, clearError])

  useEffect(() => {
    setDescription(state.data?.description || '')
  }, [state.data?.description])

  const {
    textareaRef,
    handleChange: handleTextareaChange,
    handleInput,
  } = useAutoResizeTextarea(description)

  const handleDelete = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Delete this education?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      anchorEl: deleteButtonRef.current,
      placement: 'left',
      width: 260,
    })

    if (!ok) return
    await deleteEducation(data.id)
    onClose?.()
  }

  const handleFormClose = async (): Promise<void> => {
    const form = document.querySelector(
      `form[data-tab="${FORM_IDS.EDUCATION}"]`
    ) as HTMLFormElement | null
    let isDirty = false

    if (form) {
      const current = extractEducationFormData(form)
      isDirty = hasBlockChanges(current.id, current)
    }

    if (isDirty) {
      const ok = await confirm({
        title: 'You have unsaved changes',
        message:
          'If you leave without saving, you will lose your changes. Continue?',
        confirmText: 'Yes',
        cancelText: 'No',
        anchorEl: closeButtonRef.current,
        placement: 'right',
        width: 260,
      })

      if (!ok) return
    }

    onClose?.()
  }

  const SubmitButton: React.FC = () => {
    const { pending } = useFormStatus()

    return (
      <button type='submit' className={styles.saveButton} disabled={pending}>
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
            ref={deleteButtonRef}
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
        {shouldShowCloseButton && onClose && (
          <button
            type='button'
            className={styles.closeButton}
            ref={closeButtonRef}
            onClick={handleFormClose}
          >
            <FaXmark />
          </button>
        )}
      </div>

      <div className={styles.requiredFieldsNote}>
        <span className={styles.requiredIndicator}>*</span>
        Indicates a required field
      </div>

      <form
        action={formAction}
        className={styles.educationDetails}
        data-tab={FORM_IDS.EDUCATION}
      >
        <input type='hidden' name='id' value={data.id} />
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
          <SubmitButton />
        </div>
      </form>
    </section>
  )
}

export default React.memo(EditableEducationBlock)
