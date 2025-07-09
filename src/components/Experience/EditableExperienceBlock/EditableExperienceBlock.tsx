import styles from './EditableExperienceBlock.module.scss'
import React, { useState, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { MONTHS } from '@/lib/constants'
import {
  ExperienceBlockData,
  ExperienceFormState,
} from '@/lib/types/experience'
import { KeywordData } from '@/lib/types/keywords'
import { useAutoResizeTextarea } from '@/lib/hooks'
import { submitExperience } from '@/lib/actions/experienceActions'
import { EXPERIENCE_FORM_DATA_KEYS } from '@/lib/constants'

interface EditableExperienceBlockProps {
  data: ExperienceBlockData
  isNew: boolean
  keywordData: KeywordData | null
  onDelete: (id: string) => void
  onClose: (() => void) | undefined
  onSave: (data: ExperienceBlockData) => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onLockToggle: (sectionId: string, index: number) => void
}

const EditableExperienceBlock: React.FC<EditableExperienceBlockProps> = ({
  data,
  isNew,
  onDelete,
  onClose,
  onSave,
  onAddBullet,
}) => {
  const [state, formAction] = useActionState(
    (prevState: ExperienceFormState, formData: FormData): ExperienceFormState =>
      submitExperience(prevState, formData, onSave, data.bulletPoints),
    {
      errors: {},
      data,
    } as ExperienceFormState
  )

  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(
    state.data?.endDate?.isPresent || false
  )
  const [description, setDescription] = useState(state.data?.description || '')

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

  const handleDelete = (): void => {
    if (
      window.confirm(
        'Are you sure you want to delete this work experience? This action cannot be undone.'
      )
    ) {
      onDelete(data.id)
    }
  }

  // TODO: this will be useful when saving data gets tied to a database. Add a loading indicator
  const SubmitButton: React.FC = () => {
    const { pending } = useFormStatus()

    return (
      <button type='submit' className={styles.saveButton} disabled={pending}>
        Save
      </button>
    )
  }

  return (
    <section className={styles.editableExperienceBlock}>
      <div className={styles.header}>
        {!isNew && (
          <button
            type='button'
            className={styles.deleteButton}
            onClick={handleDelete}
            // disabled={isRegenerating}
          >
            Delete
          </button>
        )}
        {onClose && (
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

      <form action={formAction} className={styles.jobDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Job Title
          </label>
          <input
            type='text'
            name={EXPERIENCE_FORM_DATA_KEYS.TITLE}
            className={`${styles.formInput} ${
              state?.errors?.title ? styles.error : ''
            }`}
            defaultValue={state.data?.title}
            placeholder='Enter your job title'
          />
          {state?.errors?.title && (
            <span className={styles.formError}>{state.errors.title}</span>
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
              state?.errors?.companyName ? styles.error : ''
            }`}
            defaultValue={state.data?.companyName}
            placeholder='Enter the company name'
          />
          {state?.errors?.companyName && (
            <span className={styles.formError}>{state.errors.companyName}</span>
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
              state?.errors?.location ? styles.error : ''
            }`}
            defaultValue={state.data?.location}
            placeholder='Enter the location'
          />
          {state?.errors?.location && (
            <span className={styles.formError}>{state.errors.location}</span>
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
          {state?.errors?.startDate && (
            <span className={styles.formError}>{state.errors.startDate}</span>
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
              <option value=''>Select Month</option>
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
          {state?.errors?.endDate && (
            <span className={styles.formError}>{state.errors.endDate}</span>
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
            placeholder='Describe your experience in detail. Focus on listing your responsibilities, achievements, and the tools you used.'
            onChange={(e) => {
              const newValue = handleTextareaChange(e)
              setDescription(newValue)
            }}
            onInput={handleInput}
          />
          {state?.errors?.description && (
            <span className={styles.formError}>{state.errors.description}</span>
          )}
        </div>

        <div className={styles.actionButtons}>
          <SubmitButton />
        </div>
      </form>

      <div className={styles.bulletPoints}>
        <div className={styles.bulletHeader}>
          <h3>Bullet Points</h3>
          <button
            type='button'
            className={styles.addButton}
            onClick={() => onAddBullet(data.id)}
            // disabled={isRegenerating}
          >
            <FaPlus /> Add
          </button>
        </div>
        <div className={styles.bulletPointsContainer}>
          {data.bulletPoints.map((bullet, index) => {
            return (
              <div key={bullet.id}>
                <p>{bullet.text}</p>
              </div>
              // <BulletPoint
              //   key={bullet.id}
              //   sectionId={data.id}
              //   index={index}
              //   text={bullet.text}
              //   keywordData={keywordData}
              //   editingText={isEditingThisBullet ? editingBulletText : ''}
              //   isRegenerating={
              //     isRegenerating &&
              //     regeneratingBullet?.section === data.id &&
              //     regeneratingBullet?.index === index
              //   }
              //   isEditing={isEditingThisBullet}
              //   disableAllControls={
              //     isRegenerating ||
              //     (editingBulletIndex !== null && !isEditingThisBullet)
              //   }
              //   errors={editingBulletIndex === index ? bulletErrors : {}}
              //   isLocked={bullet.isLocked || false}
              //   isDangerousAction={true}
              //   onCancelEdit={onBulletCancel}
              //   onBulletDelete={(index) => onBulletDelete(data.id, index)}
              //   onBulletSave={onBulletSave}
              //   onBulletEdit={(index) => onEditBullet(data.id, index)}
              //   onBulletRegenerate={handleRegenerateBullet}
              //   onTextareaChange={onTextareaChange}
              //   onLockToggle={(sectionId, index) => {
              //     onLockToggle(sectionId, index)
              //   }}
              // />
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default React.memo(EditableExperienceBlock)
