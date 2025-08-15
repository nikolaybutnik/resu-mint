import styles from './EditableExperienceBlock.module.scss'
import React, { useState, useEffect, useActionState } from 'react'
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
import { useExperienceStore } from '@/stores'
import { useAiStateStore } from '@/stores'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { BulletPoint as BulletPointType } from '@/lib/types/experience'
import { v4 as uuidv4 } from 'uuid'

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
  const { data: experienceData, save, hasChanges } = useExperienceStore()
  const { bulletIdsGenerating } = useAiStateStore()

  const isNew = !experienceData.some((block) => block.id === data.id)
  const shouldShowCloseButton = experienceData.length > 1 || !isNew
  const isAnyBulletRegenerating = bulletIdsGenerating.length > 0

  const [state, formAction] = useActionState(
    (prevState: ExperienceFormState, formData: FormData): ExperienceFormState =>
      submitExperience(
        prevState,
        formData,
        experienceData,
        data.bulletPoints,
        save
      ),
    {
      errors: {},
      data,
    } as ExperienceFormState
  )

  const updatedExperienceData = experienceData.map((block) =>
    block.id === data.id ? state.data || data : block
  )
  const currentFormHasChanges = hasChanges(updatedExperienceData)

  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(
    state.data?.endDate?.isPresent || false
  )
  const [description, setDescription] = useState(state.data?.description || '')
  const [temporaryBullet, setTemporaryBullet] =
    useState<BulletPointType | null>(null)

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
      const updatedSections = experienceData.filter(
        (section) => section.id !== data.id
      )
      save(updatedSections)
      onClose?.()
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

  const handleBulletAdd = () => {
    const newBullet: BulletPointType = {
      id: uuidv4(),
      text: '',
      isLocked: false,
      isTemporary: true,
    }
    setTemporaryBullet(newBullet)
  }

  const handleBulletCancel = () => {
    setTemporaryBullet(null)
  }

  return (
    <section className={styles.editableExperienceBlock}>
      <div className={styles.header}>
        {!isNew && (
          <button
            type='button'
            className={styles.deleteButton}
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
          <SubmitButton hasChanges={currentFormHasChanges} />
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
