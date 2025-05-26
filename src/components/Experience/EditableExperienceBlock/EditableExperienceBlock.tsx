import styles from './EditableExperienceBlock.module.scss'
import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { useDebounce } from '@/lib/utils'
import { FaXmark } from 'react-icons/fa6'
import { months, TOUCH_DELAY, VALIDATION_DELAY } from '@/lib/constants'
import { experienceBlockSchema } from '@/lib/validationSchemas'
import { Month, ExperienceBlockData } from '@/lib/types/experience'
import { v4 as uuidv4 } from 'uuid'
import { BulletPointErrors } from '@/lib/types/errors'
import { AppSettings } from '@/lib/types/settings'

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
    isProjectEditForm: boolean
  ) => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onLockToggle: (sectionId: string, index?: number) => void
  onLockToggleAll: (sectionId: string, shouldLock: boolean) => void
}

type FieldErrorKey =
  | 'invalidTitle'
  | 'invalidLink'
  | 'invalidDescription'
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
  onLockToggleAll, //TODO: implement
}) => {
  const [formData, setFormData] = useState<ExperienceBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<
    ValidationErrors<FieldErrorKey>
  >({})

  const debouncedFormData = useDebounce(formData, VALIDATION_DELAY)
  const debouncedTouched = useDebounce(touched, TOUCH_DELAY) // Ensures validation runs before showing errors

  useEffect(() => {
    // Clear form only on init or when project changes
    if (!formData || formData.id !== data.id) {
      setFormData(data)
      setTouched({})
      setFieldErrors({})
    } else {
      // If experience unchanged, just update bullets
      setFormData((prevFormData) => ({
        ...prevFormData,
        bulletPoints: data.bulletPoints,
      }))
    }
  }, [data])

  // CONTNUE FROM HERE

  const isValid = useMemo(() => {
    return experienceBlockSchema.safeParse(formData).success
  }, [formData])

  const errors = useMemo(() => {
    const result = experienceBlockSchema.safeParse(debouncedFormData)
    if (result.success) {
      return {}
    }
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      errors[path] = issue.message
    })
    return errors
  }, [debouncedFormData])

  const sanitizeYear = (val: string) => val.replace(/[^0-9]/g, '').slice(0, 4)

  const handleChange = useCallback(
    (field: FieldType, value: string | boolean, bulletIndex?: number) => {
      const updateHandlers: Record<
        string,
        (
          prev: ExperienceBlockData,
          val: string | boolean
        ) => ExperienceBlockData
      > = {
        [FieldType.JOB_TITLE]: (prev, val) => ({
          ...prev,
          jobTitle: val as string,
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

      setFormData((prev) => {
        if (field === FieldType.BULLET_POINTS && bulletIndex !== undefined) {
          return {
            ...prev,
            bulletPoints: prev.bulletPoints.map((bullet, index) =>
              index === bulletIndex
                ? { id: bullet.id, text: value as string }
                : bullet
            ),
          }
        }

        const handler = updateHandlers[field]
        return handler ? handler(prev, value) : prev
      })

      setTouched((prev) => ({
        ...prev,
        [field]: true,
        ...(field === FieldType.END_DATE_YEAR ||
        field === FieldType.END_DATE_MONTH
          ? { endDate: true }
          : field === FieldType.END_DATE_IS_PRESENT
          ? { endDate: true, 'endDate.month': true, 'endDate.year': true }
          : {}),
      }))
    },
    []
  )

  const handleAddBulletPoint = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      bulletPoints: [...prev.bulletPoints, { id: uuidv4(), text: '' }],
    }))
  }, [])

  const handleRemoveBulletPoint = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      bulletPoints: prev.bulletPoints.filter((_, i) => i !== index),
    }))
    setTouched((prev) => {
      const updated = { ...prev }
      delete updated[`bulletPoints.${index}`]
      return updated
    })
  }, [])

  const handleSave = useCallback(() => {
    if (isValid) {
      onSave(formData)
    }
  }, [formData, isValid, onSave])

  return (
    <section className={styles.editableExperienceBlock}>
      <header className={styles.header}>
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
            onChange={(e) => handleChange(FieldType.JOB_TITLE, e.target.value)}
          />
          {debouncedTouched.jobTitle && errors.jobTitle && (
            <p className={styles.formError}>{errors.jobTitle}</p>
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
          {debouncedTouched.companyName && errors.companyName && (
            <p className={styles.formError}>{errors.companyName}</p>
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
          {debouncedTouched.location && errors.location && (
            <p className={styles.formError}>{errors.location}</p>
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
          {debouncedTouched[FieldType.START_DATE_MONTH] &&
            errors[FieldType.START_DATE_MONTH] && (
              <p className={styles.formError}>
                {errors[FieldType.START_DATE_MONTH]}
              </p>
            )}
          {debouncedTouched[FieldType.START_DATE_YEAR] &&
            errors[FieldType.START_DATE_YEAR] && (
              <p className={styles.formError}>
                {errors[FieldType.START_DATE_YEAR]}
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

          {debouncedTouched['endDate.month'] && errors['endDate.month'] && (
            <p className={styles.formError}>{errors['endDate.month']}</p>
          )}
          {debouncedTouched['endDate.year'] && errors['endDate.year'] && (
            <p className={styles.formError}>{errors['endDate.year']}</p>
          )}
          {debouncedTouched.endDate && errors.endDate && (
            <p className={styles.formError}>{errors.endDate}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.formTextarea}
            value={formData.description}
            placeholder='Describe your responsibilities and achievements. Go into detail, metrics are encouraged. Format however you like.'
            onChange={(e) =>
              handleChange(FieldType.DESCRIPTION, e.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.bulletPoints}>
        <h3>Bullet Points</h3>
        <ul className={styles.bulletList}>
          {formData.bulletPoints.map((bullet, index) => (
            <li key={index} className={styles.bulletItem}>
              <input
                type='text'
                className={styles.bulletInput}
                value={bullet.text}
                onChange={(e) =>
                  handleChange(FieldType.BULLET_POINTS, e.target.value, index)
                }
              />
              <button
                type='button'
                className={styles.removeButton}
                onClick={() => handleRemoveBulletPoint(index)}
              >
                Remove
              </button>
              {debouncedTouched[FieldType.BULLET_POINTS] &&
                errors[`${FieldType.BULLET_POINTS}.${index}`] && (
                  <p className={styles.formError}>
                    {errors[`${FieldType.BULLET_POINTS}.${index}`]}
                  </p>
                )}
            </li>
          ))}
        </ul>
        <button
          type='button'
          className={styles.addButton}
          onClick={handleAddBulletPoint}
        >
          Add Bullet
        </button>
      </div>

      <button
        type='button'
        className={styles.saveButton}
        onClick={handleSave}
        disabled={!isValid}
      >
        Save
      </button>
      {!isNew && (
        <button
          type='button'
          className={styles.deleteButton}
          onClick={() => onDelete(formData.id)}
        >
          Delete
        </button>
      )}
    </section>
  )
}

export default React.memo(EditableExperienceBlock)
