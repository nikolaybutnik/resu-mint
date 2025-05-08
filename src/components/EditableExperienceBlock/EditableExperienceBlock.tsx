import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { z } from 'zod'
import { useDebounce } from '@/lib/utils'
import styles from './EditableExperienceBlock.module.scss'

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
    message: 'Month must be a valid month (e.g., Jan)',
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
      message: 'Month must be a valid month (e.g., Jan)',
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

  const handleChange = useCallback((field: string, value: string | boolean) => {
    setFormData((prev) => {
      if (field === 'jobTitle') {
        return { ...prev, jobTitle: value as string }
      }
      if (field === 'companyName') {
        return { ...prev, companyName: value as string }
      }
      if (field === 'location') {
        return { ...prev, location: value as string }
      }
      if (field === 'startDate.month') {
        return {
          ...prev,
          startDate: { ...prev.startDate, month: value as Month },
        }
      }
      if (field === 'startDate.year') {
        const digits = (value as string).replace(/[^0-9]/g, '').slice(0, 4)
        return { ...prev, startDate: { ...prev.startDate, year: digits } }
      }
      if (field === 'endDate.isPresent') {
        return {
          ...prev,
          endDate: value
            ? { month: '', year: '', isPresent: true }
            : { ...prev.endDate, isPresent: false },
        }
      }
      if (field === 'endDate.month') {
        return {
          ...prev,
          endDate: { ...prev.endDate, month: value as Month, isPresent: false },
        }
      }
      if (field === 'endDate.year') {
        const digits = (value as string).replace(/[^0-9]/g, '').slice(0, 4)
        return {
          ...prev,
          endDate: { ...prev.endDate, year: digits, isPresent: false },
        }
      }
      if (field.startsWith('bulletPoints.')) {
        const index = parseInt(field.split('.')[1], 10)
        return {
          ...prev,
          bulletPoints: [
            ...prev.bulletPoints.slice(0, index),
            value as string,
            ...prev.bulletPoints.slice(index + 1),
          ],
        }
      }
      return prev
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
  }, [])

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
        {!isNew && (
          <button
            type='button'
            className={`${styles.formButton} ${styles.formButtonSecondary}`}
            onClick={() => onDelete(formData.id)}
          >
            Delete
          </button>
        )}
        <button
          type='button'
          className={`${styles.formButton} ${styles.formButtonSecondary}`}
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <fieldset className={styles.jobDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>Job Title</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
          />
          {debouncedTouched.jobTitle && errors.jobTitle && (
            <p className={styles.formError}>{errors.jobTitle}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Company Name</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
          />
          {debouncedTouched.companyName && errors.companyName && (
            <p className={styles.formError}>{errors.companyName}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Location</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
          {debouncedTouched.location && errors.location && (
            <p className={styles.formError}>{errors.location}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Start Date</label>
          <div className={styles.dateInputs}>
            <select
              className={styles.formInput}
              value={formData.startDate.month}
              onChange={(e) => handleChange('startDate.month', e.target.value)}
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
              className={styles.formInput}
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
              onChange={(e) => handleChange('startDate.year', e.target.value)}
            />
          </div>
          {debouncedTouched['startDate.month'] && errors['startDate.month'] && (
            <p className={styles.formError}>{errors['startDate.month']}</p>
          )}
          {debouncedTouched['startDate.year'] && errors['startDate.year'] && (
            <p className={styles.formError}>{errors['startDate.year']}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>End Date</label>
          <div className={styles.checkboxField}>
            <input
              type='checkbox'
              checked={formData.endDate.isPresent}
              onChange={(e) =>
                handleChange('endDate.isPresent', e.target.checked)
              }
            />
            <label className={styles.checkboxLabel}>Present</label>
          </div>
          <div className={styles.dateInputs}>
            <select
              className={styles.formInput}
              value={formData.endDate.month}
              disabled={formData.endDate.isPresent}
              onChange={(e) => handleChange('endDate.month', e.target.value)}
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
              className={styles.formInput}
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
              onChange={(e) => handleChange('endDate.year', e.target.value)}
            />
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
      </fieldset>

      <fieldset className={styles.bulletPoints}>
        <legend className={styles.legend}>Bullet Points</legend>
        <ul className={styles.bulletList}>
          {formData.bulletPoints.map((bullet, index) => (
            <li key={index} className={styles.bulletItem}>
              <input
                type='text'
                className={styles.formInput}
                value={bullet}
                onChange={(e) =>
                  handleChange(`bulletPoints.${index}`, e.target.value)
                }
              />
              <button
                type='button'
                className={styles.removeButton}
                onClick={() => handleRemoveBulletPoint(index)}
              >
                Remove
              </button>
              {debouncedTouched[`bulletPoints.${index}`] &&
                errors[`bulletPoints.${index}`] && (
                  <p className={styles.formError}>
                    {errors[`bulletPoints.${index}`]}
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
      </fieldset>

      <button
        type='button'
        className={styles.formButton}
        onClick={handleSave}
        disabled={!isValid}
      >
        Save
      </button>
    </section>
  )
}

export default React.memo(EditableExperienceBlock)
