import styles from './EditableExperienceBlock.module.scss'
import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { useDebounce } from '@/lib/utils'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { months, TOUCH_DELAY, VALIDATION_DELAY } from '@/lib/constants'
import { experienceBlockSchema } from '@/lib/validationSchemas'
import {
  Month,
  ExperienceBlockData,
  BulletPoint as BulletPointType,
} from '@/lib/types/experience'
import { BulletPointErrors } from '@/lib/types/errors'
import { AppSettings } from '@/lib/types/settings'
import { isEqual } from 'lodash'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'

interface EditableExperienceBlockProps {
  data: ExperienceBlockData
  isNew: boolean
  editingBulletIndex: number | null
  editingBulletText: string
  bulletErrors: BulletPointErrors
  settings: AppSettings
  isRegenerating: boolean
  regeneratingBullet: { section: string; index: number } | null
  onDelete: (id: string) => void
  onClose: () => void
  onSave: (data: ExperienceBlockData) => void
  onRegenerateBullet: (
    sectionId: string,
    index: number,
    formData?: ExperienceBlockData
  ) => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onLockToggle: (sectionId: string, index: number) => void
}

type FieldErrorKey =
  | 'invalidTitle'
  | 'invalidDescription'
  | 'invalidLocation'
  | 'invalidCompanyName'
  | 'invalidStartDateMonth'
  | 'invalidStartDateYear'
  | 'invalidEndDateMonth'
  | 'invalidEndDateYear'
  | 'invalidEndDate'

type ValidationErrors<T extends string = string> = {
  [K in T]?: string[]
}

const FieldType = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  COMPANY_NAME: 'companyName',
  LOCATION: 'location',
  START_DATE_MONTH: 'startDate.month',
  START_DATE_YEAR: 'startDate.year',
  END_DATE_IS_PRESENT: 'endDate.isPresent',
  END_DATE_MONTH: 'endDate.month',
  END_DATE_YEAR: 'endDate.year',
  BULLET_POINTS: 'bulletPoints',
} as const

const EditableExperienceBlock: React.FC<EditableExperienceBlockProps> = ({
  data,
  isNew,
  settings,
  isRegenerating,
  editingBulletIndex,
  editingBulletText,
  bulletErrors,
  regeneratingBullet,
  onDelete,
  onClose,
  onSave,
  onRegenerateBullet,
  onAddBullet,
  onEditBullet,
  onBulletSave,
  onBulletCancel,
  onBulletDelete,
  onTextareaChange,
  onLockToggle,
}) => {
  const [formData, setFormData] = useState<ExperienceBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<
    ValidationErrors<FieldErrorKey>
  >({})

  const debouncedFormData = useDebounce(formData, VALIDATION_DELAY)
  const debouncedTouched = useDebounce(touched, TOUCH_DELAY) // Ensures validation runs before showing errors

  useEffect(() => {
    setFormData(data)
  }, [])

  useEffect(() => {
    setFormData((prev) => {
      if (!isEqual(prev.bulletPoints, data.bulletPoints)) {
        return {
          ...prev,
          bulletPoints: data.bulletPoints,
        }
      }
      return prev
    })
  }, [data])

  useEffect(() => {
    const result = experienceBlockSchema.safeParse(debouncedFormData)
    if (result.success) {
      setFieldErrors({})
      return
    }

    const errors: ValidationErrors<FieldErrorKey> = {}
    result.error.issues
      .filter((issue) => issue.message !== '')
      .forEach((issue) => {
        const path = issue.path.join('.')
        if (!path.startsWith('bulletPoints.')) {
          switch (path) {
            case 'title':
              errors.invalidTitle = [issue.message]
              break
            case 'description':
              errors.invalidDescription = [issue.message]
              break
            case 'location':
              errors.invalidLocation = [issue.message]
              break
            case 'companyName':
              errors.invalidCompanyName = [issue.message]
              break
            case 'startDate.month':
              errors.invalidStartDateMonth = [issue.message]
              break
            case 'startDate.year':
              errors.invalidStartDateYear = [issue.message]
              break
            case 'endDate.month':
              errors.invalidEndDateMonth = [issue.message]
              break
            case 'endDate.year':
              errors.invalidEndDateYear = [issue.message]
              break
            case 'endDate':
              errors.invalidEndDate = [issue.message]
              break
          }
        }
      })
    setFieldErrors((prev) => (isEqual(prev, errors) ? prev : errors))
  }, [debouncedFormData])

  const isValid = useMemo(() => {
    return experienceBlockSchema.safeParse(formData).success
  }, [formData])

  const sanitizeYear = useCallback(
    (val: string) => val.replace(/[^0-9]/g, '').slice(0, 4),
    []
  )

  const handleChange = useCallback(
    (
      field: (typeof FieldType)[keyof typeof FieldType],
      value: string | string[] | boolean | BulletPointType,
      bulletIndex?: number
    ) => {
      setFormData((prev) => {
        if (field === FieldType.BULLET_POINTS && bulletIndex !== undefined) {
          return {
            ...prev,
            bulletPoints: prev.bulletPoints.map((bullet, index) =>
              index === bulletIndex
                ? {
                    id: bullet.id,
                    text: value as string,
                    isLocked: bullet.isLocked,
                  }
                : bullet
            ),
          }
        }

        const updateHandlers: Record<
          string,
          (
            prev: ExperienceBlockData,
            val: string | string[] | boolean | BulletPointType
          ) => ExperienceBlockData
        > = {
          [FieldType.TITLE]: (prev, val) => ({
            ...prev,
            title: val as string,
          }),
          [FieldType.COMPANY_NAME]: (prev, val) => ({
            ...prev,
            companyName: val as string,
          }),
          [FieldType.LOCATION]: (prev, val) => ({
            ...prev,
            location: val as string,
          }),
          [FieldType.START_DATE_MONTH]: (prev, val) => ({
            ...prev,
            startDate: { ...prev.startDate, month: val as Month },
          }),
          [FieldType.START_DATE_YEAR]: (prev, val) => ({
            ...prev,
            startDate: { ...prev.startDate, year: sanitizeYear(val as string) },
          }),
          [FieldType.END_DATE_IS_PRESENT]: (prev, val) => ({
            ...prev,
            endDate: val
              ? { month: '', year: '', isPresent: true }
              : { ...prev.endDate, isPresent: false },
          }),
          [FieldType.END_DATE_MONTH]: (prev, val) => ({
            ...prev,
            endDate: { ...prev.endDate, month: val as Month, isPresent: false },
          }),
          [FieldType.END_DATE_YEAR]: (prev, val) => ({
            ...prev,
            endDate: {
              ...prev.endDate,
              year: sanitizeYear(val as string),
              isPresent: false,
            },
          }),
          [FieldType.DESCRIPTION]: (prev, val) => ({
            ...prev,
            description: val as string,
          }),
        }

        const handler = updateHandlers[field]
        return handler ? handler(prev, value) : prev
      })

      setTouched((prev) => ({
        ...prev,
        [field]: true,
        ...(field === FieldType.END_DATE_IS_PRESENT
          ? { endDate: true, 'endDate.month': true, 'endDate.year': true }
          : field.startsWith('endDate')
          ? { endDate: true }
          : {}),
      }))
    },
    [sanitizeYear]
  )

  const handleDelete = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to delete this work experience? This action cannot be undone.'
      )
    ) {
      onDelete(formData.id)
    }
  }, [formData.id, onDelete])

  const handleSave = useCallback(() => {
    if (isValid) {
      onSave(formData)
    }
  }, [formData, isValid, onSave])

  const emptyBulletErrors = useMemo(() => ({}), [])
  const combinedBulletErrors = useMemo(
    () =>
      formData.bulletPoints.map((_, index) =>
        editingBulletIndex === index ? bulletErrors : emptyBulletErrors
      ),
    [bulletErrors, editingBulletIndex, formData.bulletPoints, emptyBulletErrors]
  )

  const handleRegenerateBullet = useCallback(
    (sectionId: string, index: number) => {
      if (sectionId === formData.id) {
        onRegenerateBullet(sectionId, index, formData)
      }
    },
    [formData, onRegenerateBullet]
  )

  return (
    <section className={styles.editableExperienceBlock}>
      <header className={styles.header}>
        {!isNew && (
          <button
            type='button'
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={isRegenerating}
          >
            Delete
          </button>
        )}
        <button type='button' className={styles.closeButton} onClick={onClose}>
          <FaXmark />
        </button>
      </header>

      <div className={styles.jobDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>Job Title *</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.title}
            onChange={(e) => handleChange(FieldType.TITLE, e.target.value)}
          />
          {debouncedTouched.title && fieldErrors.invalidTitle && (
            <p className={styles.formError}>{fieldErrors.invalidTitle[0]}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Company Name *</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.companyName}
            onChange={(e) =>
              handleChange(FieldType.COMPANY_NAME, e.target.value)
            }
          />
          {debouncedTouched.companyName && fieldErrors.invalidCompanyName && (
            <p className={styles.formError}>
              {fieldErrors.invalidCompanyName[0]}
            </p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Location *</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.location}
            onChange={(e) => handleChange(FieldType.LOCATION, e.target.value)}
          />
          {debouncedTouched.location && fieldErrors.invalidLocation && (
            <p className={styles.formError}>{fieldErrors.invalidLocation[0]}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Start Date *</label>
          <div className={styles.dateInputs}>
            <select
              className={[styles.formInput, styles.monthInput].join(' ')}
              value={formData.startDate.month}
              onChange={(e) =>
                handleChange(FieldType.START_DATE_MONTH, e.target.value)
              }
            >
              <option value=''>Select Month</option>
              {months.map((month) => (
                <option key={month.label} value={month.label}>
                  {month.label}
                </option>
              ))}
            </select>
            <input
              type='text'
              name='startDate.year'
              placeholder='YYYY'
              className={[styles.formInput, styles.yearInput].join(' ')}
              value={formData.startDate.year}
              maxLength={4}
              onInput={(e) => {
                const value = e.currentTarget.value
                if (!/^\d{0,4}$/.test(value)) {
                  e.currentTarget.value = value
                    .replace(/[^0-9]/g, '')
                    .slice(0, 4)
                }
              }}
              onChange={(e) =>
                handleChange(FieldType.START_DATE_YEAR, e.target.value)
              }
            />
          </div>
          {fieldErrors.invalidStartDateMonth && (
            <p className={styles.formError}>
              {fieldErrors.invalidStartDateMonth[0]}
            </p>
          )}
          {debouncedTouched[FieldType.START_DATE_YEAR] &&
            fieldErrors.invalidStartDateYear && (
              <p className={styles.formError}>
                {fieldErrors.invalidStartDateYear[0]}
              </p>
            )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>End Date *</label>
          <div className={styles.dateInputs}>
            <select
              className={[styles.formInput, styles.monthInput].join(' ')}
              value={formData.endDate.month}
              disabled={formData.endDate.isPresent}
              onChange={(e) =>
                handleChange(FieldType.END_DATE_MONTH, e.target.value)
              }
            >
              <option value=''>Select Month</option>
              {months.map((month) => (
                <option key={month.label} value={month.label}>
                  {month.label}
                </option>
              ))}
            </select>
            <input
              type='text'
              name='endDate.year'
              placeholder='YYYY'
              className={[styles.formInput, styles.yearInput].join(' ')}
              disabled={formData.endDate.isPresent}
              value={formData.endDate.year}
              maxLength={4}
              onInput={(e) => {
                const value = e.currentTarget.value
                if (!/^\d{0,4}$/.test(value)) {
                  e.currentTarget.value = value
                    .replace(/[^0-9]/g, '')
                    .slice(0, 4)
                }
              }}
              onChange={(e) =>
                handleChange(FieldType.END_DATE_YEAR, e.target.value)
              }
            />
          </div>
          <div className={styles.checkboxField}>
            <input
              type='checkbox'
              checked={formData.endDate.isPresent}
              onChange={(e) =>
                handleChange(FieldType.END_DATE_IS_PRESENT, e.target.checked)
              }
            />
            <label className={styles.checkboxLabel}>Present</label>
          </div>
          {fieldErrors.invalidEndDateMonth && (
            <p className={styles.formError}>
              {fieldErrors.invalidEndDateMonth[0]}
            </p>
          )}
          {debouncedTouched['endDate.year'] &&
            fieldErrors.invalidEndDateYear && (
              <p className={styles.formError}>
                {fieldErrors.invalidEndDateYear[0]}
              </p>
            )}
          {debouncedTouched.endDate && fieldErrors.invalidEndDate && (
            <p className={styles.formError}>{fieldErrors.invalidEndDate[0]}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.formTextarea}
            value={formData.description}
            rows={4}
            maxLength={1000}
            placeholder='Describe your experience in detail. Format however you like.'
            onChange={(e) =>
              handleChange(FieldType.DESCRIPTION, e.target.value)
            }
          />
          {debouncedTouched.description && fieldErrors.invalidDescription && (
            <p className={styles.formError}>
              {fieldErrors.invalidDescription[0]}
            </p>
          )}
        </div>
      </div>

      <div className={styles.bulletPoints}>
        <div className={styles.bulletHeader}>
          <h3>Bullet Points</h3>
          <button
            type='button'
            className={styles.addButton}
            onClick={() => onAddBullet(formData.id)}
            disabled={isRegenerating || !isValid}
          >
            <FaPlus /> Add
          </button>
        </div>
        <div className={styles.bulletPointsContainer}>
          {formData.bulletPoints.map((bullet, index) => {
            const isEditingThisBullet = editingBulletIndex === index

            return (
              <BulletPoint
                key={bullet.id}
                sectionId={formData.id}
                index={index}
                text={bullet.text}
                editingText={isEditingThisBullet ? editingBulletText : ''}
                isRegenerating={
                  isRegenerating &&
                  regeneratingBullet?.section === formData.id &&
                  regeneratingBullet?.index === index
                }
                isEditing={isEditingThisBullet}
                disableAllControls={
                  isRegenerating ||
                  (editingBulletIndex !== null && !isEditingThisBullet)
                }
                errors={combinedBulletErrors[index]}
                settings={settings}
                isLocked={bullet.isLocked}
                onCancelEdit={onBulletCancel}
                onBulletDelete={(index) => onBulletDelete(formData.id, index)}
                onBulletSave={onBulletSave}
                onBulletEdit={(index) => onEditBullet(formData.id, index)}
                onBulletRegenerate={handleRegenerateBullet}
                onTextareaChange={onTextareaChange}
                onLockToggle={(sectionId, index) => {
                  onLockToggle(sectionId, index)
                }}
              />
            )
          })}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button
          type='button'
          className={styles.saveButton}
          onClick={handleSave}
          disabled={!isValid || editingBulletIndex !== null || isRegenerating}
        >
          Save
        </button>
      </div>
    </section>
  )
}

export default React.memo(EditableExperienceBlock)
