import React, { useMemo, useCallback } from 'react'
import { z } from 'zod'
import { useDebounce } from '@/lib/utils'
import styles from './ExperienceBlock.module.scss'

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

interface ExperienceBlockProps {
  id: string
  data: ExperienceBlockData
  onBlockUpdate: (
    id: string,
    data: ExperienceBlockData,
    isValid: boolean
  ) => void
  onDelete: (id: string) => void
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
      .min(1, 'At least one bullet point is required'),
  })
  .refine(
    (data) =>
      data.endDate.isPresent ||
      !data.endDate.month ||
      !data.endDate.year ||
      new Date(`${data.endDate.month} ${data.endDate.year}`) >=
        new Date(`${data.startDate.month} ${data.startDate.year}`),
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )

type Errors = {
  jobTitle?: string
  companyName?: string
  location?: string
  startDate?: string
  endDate?: string
  bulletPoints?: string[]
}

const ExperienceBlock: React.FC<ExperienceBlockProps> = ({
  id,
  data,
  onBlockUpdate,
  onDelete,
}) => {
  const debouncedData = useDebounce(data, 300)

  const { isValid, errors } = useMemo(() => {
    const result = experienceBlockSchema.safeParse(debouncedData)
    if (result.success) {
      return { isValid: true, errors: {} }
    }
    const errors: Errors = {}
    result.error.issues.forEach((issue) => {
      const path = issue.path[0] as keyof Errors
      if (path === 'bulletPoints') {
        errors.bulletPoints = errors.bulletPoints || []
        errors.bulletPoints[issue.path[1] as number] = issue.message
      } else {
        errors[path] = issue.message
      }
    })
    return { isValid: false, errors }
  }, [debouncedData])

  const handleChange = useCallback(
    (
      field:
        | keyof ExperienceBlockData
        | 'startDate.month'
        | 'startDate.year'
        | 'endDate.month'
        | 'endDate.year'
        | 'endDate.isPresent'
        | `bulletPoints.${number}`,
      value: string | boolean
    ) => {
      const updatedData = { ...data }
      if (
        field === 'jobTitle' ||
        field === 'companyName' ||
        field === 'location'
      ) {
        updatedData[field] = value as string
      } else if (field === 'startDate.month') {
        updatedData.startDate = { ...data.startDate, month: value as Month }
      } else if (field === 'startDate.year') {
        updatedData.startDate = { ...data.startDate, year: value as string }
      } else if (field === 'endDate.month') {
        updatedData.endDate = {
          ...data.endDate,
          month: value as Month,
          isPresent: false,
        }
      } else if (field === 'endDate.year') {
        updatedData.endDate = {
          ...data.endDate,
          year: value as string,
          isPresent: false,
        }
      } else if (field === 'endDate.isPresent') {
        updatedData.endDate = value
          ? { month: '' as Month, year: '', isPresent: true }
          : { ...data.endDate, isPresent: false }
      } else if (field.startsWith('bulletPoints.')) {
        const index = parseInt(field.split('.')[1], 10)
        updatedData.bulletPoints = [...data.bulletPoints]
        updatedData.bulletPoints[index] = value as string
      }
      onBlockUpdate(id, updatedData, isValid)
    },
    [data, id, isValid, onBlockUpdate]
  )

  const addBullet = useCallback(() => {
    const updatedData = { ...data, bulletPoints: [...data.bulletPoints, ''] }
    onBlockUpdate(id, updatedData, isValid)
  }, [data, id, isValid, onBlockUpdate])

  const deleteBullet = useCallback(
    (index: number) => {
      const updatedData = {
        ...data,
        bulletPoints: data.bulletPoints.filter((_, i) => i !== index),
      }
      onBlockUpdate(id, updatedData, isValid)
    },
    [data, id, isValid, onBlockUpdate]
  )

  const handleYearInput = useCallback(
    (value: string, setter: (value: string) => void) => {
      if (/^\d{0,4}$/.test(value)) {
        setter(value)
      }
    },
    []
  )

  return (
    <section className={styles.experienceBlock}>
      <header className={styles.header}>
        <h3 className={styles.formTitle}>Experience</h3>
        <button
          type='button'
          className={`${styles.formButton} ${styles.formButtonSecondary}`}
          onClick={() => onDelete(id)}
        >
          Delete
        </button>
      </header>

      <fieldset className={styles.jobDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>Job Title</label>
          <input
            type='text'
            className={styles.formInput}
            value={data.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
          />
          {errors.jobTitle && (
            <p className={styles.formError}>{errors.jobTitle}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Company Name</label>
          <input
            type='text'
            className={styles.formInput}
            value={data.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
          />
          {errors.companyName && (
            <p className={styles.formError}>{errors.companyName}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Location</label>
          <input
            type='text'
            className={styles.formInput}
            value={data.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
          {errors.location && (
            <p className={styles.formError}>{errors.location}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Start Date</label>
          <div className={styles.dateInputs}>
            <select
              className={styles.formInput}
              value={data.startDate.month}
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
              className={styles.formInput}
              value={data.startDate.year}
              onChange={(e) =>
                handleYearInput(e.target.value, (value) =>
                  handleChange('startDate.year', value)
                )
              }
              placeholder='YYYY'
              maxLength={4}
            />
          </div>
          {errors.startDate && (
            <p className={styles.formError}>{errors.startDate}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>End Date</label>
          <div className={styles.checkboxField}>
            <input
              type='checkbox'
              checked={data.endDate.isPresent}
              onChange={(e) =>
                handleChange('endDate.isPresent', e.target.checked)
              }
            />
            <label className={styles.checkboxLabel}>Present</label>
          </div>
          <div className={styles.dateInputs}>
            <select
              className={styles.formInput}
              value={data.endDate.month}
              onChange={(e) => handleChange('endDate.month', e.target.value)}
              disabled={data.endDate.isPresent}
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
              className={styles.formInput}
              value={data.endDate.year}
              onChange={(e) =>
                handleYearInput(e.target.value, (value) =>
                  handleChange('endDate.year', value)
                )
              }
              placeholder='YYYY'
              maxLength={4}
              disabled={data.endDate.isPresent}
            />
          </div>
          {errors.endDate && (
            <p className={styles.formError}>{errors.endDate}</p>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.bulletPoints}>
        <legend className={styles.legend}>Bullet Points</legend>
        <ul className={styles.bulletList}>
          {data.bulletPoints.map((bullet, index) => (
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
                className={`${styles.formButton} ${styles.formButtonSecondary}`}
                onClick={() => deleteBullet(index)}
              >
                Delete
              </button>
              {errors.bulletPoints?.[index] && (
                <p className={styles.formError}>{errors.bulletPoints[index]}</p>
              )}
            </li>
          ))}
        </ul>
        <button
          type='button'
          className={`${styles.formButton} ${styles.formButtonSecondary}`}
          onClick={addBullet}
        >
          Add Bullet
        </button>
      </fieldset>
    </section>
  )
}

export default React.memo(ExperienceBlock)
