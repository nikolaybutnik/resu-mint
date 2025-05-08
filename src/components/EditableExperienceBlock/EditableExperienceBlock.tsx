import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { z } from 'zod'
import { useDebounce } from '@/lib/utils'
import styles from './EditableExperienceBlock.module.scss'
import { FaXmark } from 'react-icons/fa6'

export type Month =
  | 'Jan'
  | 'Feb'
  | 'Mar'
  | 'Apr'
  | 'May'
  | 'Jun'
  | 'Jul'
  | 'Aug'
  | 'Sep'
  | 'Oct'
  | 'Nov'
  | 'Dec'

type StartDate = {
  month: Month
  year: string
}

type EndDate = {
  month: Month | ''
  year: string
  isPresent: boolean
}

enum FieldType {
  JOB_TITLE = 'jobTitle',
  COMPANY_NAME = 'companyName',
  LOCATION = 'location',
  BULLET_POINTS = 'bulletPoints',
  START_DATE_MONTH = 'startDate.month',
  START_DATE_YEAR = 'startDate.year',
  END_DATE_IS_PRESENT = 'endDate.isPresent',
  END_DATE_MONTH = 'endDate.month',
  END_DATE_YEAR = 'endDate.year',
}

export interface ExperienceBlockData {
  id: string
  jobTitle: string
  startDate: StartDate
  endDate: EndDate
  companyName: string
  location: string
  bulletPoints: string[]
}

interface EditableExperienceBlockProps {
  data: ExperienceBlockData
  isNew: boolean
  onDelete: (id: string) => void
  onClose: () => void
  onSave: (data: ExperienceBlockData) => void
}

const months: Month[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const monthToNumber: Record<Month, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

const startDateSchema = z.object({
  month: z.enum(months as [Month, ...Month[]], {
    message: 'Month is required',
  }),
  year: z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
})

const endDateSchema = z.discriminatedUnion('isPresent', [
  z.object({
    isPresent: z.literal(true),
    month: z.literal(''),
    year: z.literal(''),
  }),
  z.object({
    isPresent: z.literal(false),
    month: z.enum(months as [Month, ...Month[]], {
      message: 'Month is required',
    }),
    year: z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
  }),
])

export const experienceBlockSchema = z
  .object({
    jobTitle: z
      .string()
      .min(1, 'Job title is required')
      .max(100, 'Job title must be 100 characters or less'),
    startDate: startDateSchema,
    endDate: endDateSchema,
    companyName: z
      .string()
      .min(1, 'Company name is required')
      .max(100, 'Company name must be 100 characters or less'),
    location: z
      .string()
      .min(1, 'Location is required')
      .max(100, 'Location must be 100 characters or less'),
    bulletPoints: z
      .array(
        z
          .string()
          .min(1, 'Bullet point cannot be empty')
          .max(200, 'Bullet point must be 200 characters or less')
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      if (data.endDate.isPresent || !data.endDate.month || !data.endDate.year) {
        return true
      }
      const startDate = new Date(
        parseInt(data.startDate.year),
        monthToNumber[data.startDate.month],
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        monthToNumber[data.endDate.month],
        1
      )
      return endDate >= startDate
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )

const EditableExperienceBlock: React.FC<EditableExperienceBlockProps> = ({
  data,
  isNew,
  onDelete,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ExperienceBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const debouncedFormData = useDebounce(formData, 300)
  const debouncedTouched = useDebounce(touched, 300)

  useEffect(() => {
    setFormData(data)
    setTouched({})
  }, [data])

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
      }

      setFormData((prev) => {
        if (field === FieldType.BULLET_POINTS && bulletIndex !== undefined) {
          return {
            ...prev,
            bulletPoints: [
              ...prev.bulletPoints.slice(0, bulletIndex),
              value as string,
              ...prev.bulletPoints.slice(bulletIndex + 1),
            ],
          }
        }

        const handler = updateHandlers[field]
        return handler ? handler(prev, value) : prev
      })

      setTouched((prev) => ({
        ...prev,
        [field]: true,
        ...(field === 'endDate.isPresent'
          ? { endDate: true, 'endDate.month': true, 'endDate.year': true }
          : field.startsWith('endDate')
          ? { endDate: true }
          : {}),
      }))
    },
    []
  )

  const handleAddBulletPoint = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      bulletPoints: [...prev.bulletPoints, ''],
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
    <section className={styles.experienceBlock}>
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
            value={formData.jobTitle}
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
                <option key={month} value={month}>
                  {month}
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
                <option key={month} value={month}>
                  {month}
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
      </div>

      <div className={styles.bulletPoints}>
        <h3>Bullet Points</h3>
        <ul className={styles.bulletList}>
          {formData.bulletPoints.map((bullet, index) => (
            <li key={index} className={styles.bulletItem}>
              <input
                type='text'
                className={styles.bulletInput}
                value={bullet}
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
        className={styles.formButton}
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
