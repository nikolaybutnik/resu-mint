import styles from './EditableExperienceBlock.module.scss'
import React, { useState, useEffect, useActionState, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { FORM_IDS, MONTHS } from '@/lib/constants'
import {
  ExperienceBlockData,
  ExperienceFormState,
} from '@/lib/types/experience'
import { KeywordData } from '@/lib/types/keywords'
import { useAutoResizeTextarea } from '@/lib/hooks'
import { submitExperience } from '@/lib/actions/experienceActions'
import { EXPERIENCE_FORM_DATA_KEYS } from '@/lib/constants'
import { useExperienceStore, confirm } from '@/stores'
import { useAiStateStore } from '@/stores'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { BulletPoint as BulletPointType } from '@/lib/types/experience'
import { v4 as uuidv4 } from 'uuid'
import { extractExperienceFormData } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

interface EditableExperienceBlockProps {
  data: ExperienceBlockData
  keywordData: KeywordData | null
  onClose: (() => void) | undefined
}

const EditableExperienceBlock: React.FC<EditableExperienceBlockProps> = ({
  data,
  keywordData,
  onClose,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null)

  const {
    data: experienceData,
    delete: deleteExperience,
    upsert,
    hasBlockChanges,
  } = useExperienceStore()
  const { bulletIdsGenerating } = useAiStateStore()

  const isNew = !experienceData.some((block) => block.id === data.id)
  const shouldShowCloseButton = experienceData.length > 0 || !isNew

  const isAnyBulletRegenerating = bulletIdsGenerating.length > 0

  const [state, formAction] = useActionState(
    async (
      prevState: ExperienceFormState,
      formData: FormData
    ): Promise<ExperienceFormState> =>
      submitExperience(prevState, formData, data.bulletPoints, upsert),
    {
      fieldErrors: {},
      data,
    } as ExperienceFormState
  )

  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(
    state.data?.endDate?.isPresent || false
  )
  const [description, setDescription] = useState(state.data?.description || '')
  const [temporaryBullet, setTemporaryBullet] =
    useState<BulletPointType | null>(null)

  useEffect(() => {
    const notifications = state?.notifications
    if (!notifications || notifications.length === 0) return

    notifications.forEach((notification) => {
      toast[notification.type](notification.message)
    })
  }, [state?.notifications])

  useEffect(() => {
    setIsCurrentlyWorking(state.data?.endDate?.isPresent || false)
  }, [state.data?.endDate?.isPresent])

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
      title: 'Delete this work experience?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      anchorEl: deleteButtonRef.current,
      placement: 'left',
      width: 260,
    })

    if (!ok) return

    await deleteExperience(data.id)
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

  const handleBulletAdd = (): void => {
    const newBullet: BulletPointType = {
      id: uuidv4(),
      text: '',
      isLocked: false,
      isTemporary: true,
    }
    setTemporaryBullet(newBullet)
  }

  const handleBulletCancel = (): void => {
    setTemporaryBullet(null)
  }

  const handleFormClose = async (): Promise<void> => {
    const form = document.querySelector(
      `form[data-tab="${FORM_IDS.EXPERIENCE}"]`
    ) as HTMLFormElement | null
    let isDirty = false

    if (form) {
      const current = extractExperienceFormData(form)
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

  return (
    <section className={styles.editableExperienceBlock}>
      <div className={styles.header}>
        {!isNew && (
          <button
            type='button'
            className={styles.deleteButton}
            ref={deleteButtonRef}
            onClick={handleDelete}
            disabled={isAnyBulletRegenerating}
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
        className={styles.experienceDetails}
        data-tab={FORM_IDS.EXPERIENCE}
      >
        <input type='hidden' name='id' value={data.id} />
        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Job Title
          </label>
          <input
            type='text'
            name={EXPERIENCE_FORM_DATA_KEYS.TITLE}
            className={`${styles.formInput} ${
              state?.fieldErrors?.title ? styles.error : ''
            }`}
            defaultValue={state.data?.title}
            placeholder='Enter your job title'
          />
          {state?.fieldErrors?.title && (
            <span className={styles.formError}>{state.fieldErrors.title}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Company Name
          </label>
          <input
            type='text'
            name={EXPERIENCE_FORM_DATA_KEYS.COMPANY_NAME}
            className={`${styles.formInput} ${
              state?.fieldErrors?.companyName ? styles.error : ''
            }`}
            defaultValue={state.data?.companyName}
            placeholder='Enter the company name'
          />
          {state?.fieldErrors?.companyName && (
            <span className={styles.formError}>
              {state.fieldErrors.companyName}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Location
          </label>
          <input
            type='text'
            name={EXPERIENCE_FORM_DATA_KEYS.LOCATION}
            className={`${styles.formInput} ${
              state?.fieldErrors?.location ? styles.error : ''
            }`}
            defaultValue={state.data?.location}
            placeholder='Enter the location'
          />
          {state?.fieldErrors?.location && (
            <span className={styles.formError}>
              {state.fieldErrors.location}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Start Date
          </label>
          <div className={styles.dateInputs}>
            <select
              key={state.data?.startDate?.month} // Force re-render, selects are not re-rendered when defaultValue changes.
              name={EXPERIENCE_FORM_DATA_KEYS.START_DATE_MONTH}
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
              name={EXPERIENCE_FORM_DATA_KEYS.START_DATE_YEAR}
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
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            End Date
          </label>
          <div className={styles.dateInputs}>
            <select
              key={state.data?.endDate?.month}
              name={EXPERIENCE_FORM_DATA_KEYS.END_DATE_MONTH}
              className={[styles.formInput, styles.monthInput].join(' ')}
              defaultValue={state.data?.endDate?.month || ''}
              disabled={isCurrentlyWorking}
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
              defaultValue={state.data?.endDate?.year || ''}
              disabled={isCurrentlyWorking}
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
          <div className={styles.checkboxField}>
            <input
              type='checkbox'
              name={EXPERIENCE_FORM_DATA_KEYS.END_DATE_IS_PRESENT}
              value='true'
              defaultChecked={state.data?.endDate?.isPresent || false}
              key={`checkbox-${state.data?.endDate?.isPresent}`} // Force re-render when state changes
              onChange={(e) => {
                setIsCurrentlyWorking(e.target.checked)
              }}
            />
            <label className={styles.checkboxLabel}>
              Currently Working Here
            </label>
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
            name={EXPERIENCE_FORM_DATA_KEYS.DESCRIPTION}
            className={styles.formTextarea}
            value={description}
            rows={4}
            placeholder='Describe your experience in detail. List your responsibilities, achievements, metrics, and the tools you used. We recommend you copy and paste the existing content of your LinkedIn or resume.'
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

      {!isNew && (
        <div className={styles.bulletPoints}>
          <div className={styles.bulletHeader}>
            <h3>Bullet Points</h3>
            <button
              type='button'
              className={styles.addButton}
              disabled={isAnyBulletRegenerating}
              onClick={handleBulletAdd}
            >
              <FaPlus /> Add
            </button>
          </div>
          <div className={styles.bulletPointsContainer}>
            {data.bulletPoints.map((bullet) => {
              return (
                <BulletPoint
                  key={bullet.id}
                  sectionId={data.id}
                  sectionType='experience'
                  bulletData={bullet}
                  keywordData={keywordData}
                  onBulletCancel={handleBulletCancel}
                />
              )
            })}
            {temporaryBullet && (
              <BulletPoint
                key={temporaryBullet.id}
                sectionId={data.id}
                sectionType='experience'
                keywordData={keywordData}
                bulletData={temporaryBullet}
                onBulletCancel={handleBulletCancel}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default React.memo(EditableExperienceBlock)
