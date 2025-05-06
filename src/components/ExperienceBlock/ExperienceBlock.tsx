import { useDebounce } from '@/lib/utils'
import styles from './ExperienceBlock.module.scss'
import { useEffect, useState, memo, useMemo, useCallback } from 'react'
import { z } from 'zod'

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
  onUpdate: (id: string, data: ExperienceBlockData) => void
  onDelete: (id: string) => void
}

enum ExperienceBlockFields {
  JOB_TITLE = 'jobTitle',
  COMPANY_NAME = 'companyName',
  START_DATE = 'startDate',
  END_DATE = 'endDate',
  LOCATION = 'location',
  BULLET_POINTS = 'bulletPoints',
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

type ValidationErrors = { [key: string]: string }

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

const experienceBlockSchema = z
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
    (data) => {
      const startResult = startDateSchema.safeParse(data.startDate)
      const endResult = endDateSchema.safeParse(data.endDate)
      if (!startResult.success || !endResult.success) return true
      const startDateStr = `${startResult.data.month} ${startResult.data.year}`
      const endDateStr = !endResult.data.isPresent
        ? `${endResult.data.month} ${endResult.data.year}`
        : 'Present'
      if (endDateStr === 'Present' || endDateStr === '') return true
      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)
      return endDate >= startDate
    },
    {
      message: 'End date must be on or after start date',
      path: [ExperienceBlockFields.END_DATE],
    }
  )

const arePropsEqual = (
  prevProps: ExperienceBlockProps,
  nextProps: ExperienceBlockProps
): boolean => {
  return (
    prevProps.id === nextProps.id &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onDelete === nextProps.onDelete
  )
}

const ExperienceBlock: React.FC<ExperienceBlockProps> = ({
  id,
  data,
  onUpdate,
  onDelete,
}) => {
  const initialData = useMemo(
    () => ({
      ...data,
      endDate: {
        ...data.endDate,
        isPresent: data.endDate.month === '' && data.endDate.year === '',
      },
    }),
    [data]
  )

  const [experienceData, setExperienceData] =
    useState<ExperienceBlockData>(initialData)
  const [errors, setErrors] = useState<ValidationErrors>({})

  const debouncedExperienceData = useDebounce(experienceData, 300)

  const validateField = useCallback(
    <K extends keyof ExperienceBlockData>(
      field: K,
      value: ExperienceBlockData[K]
    ) => {
      const updatedData = { ...experienceData, [field]: value }
      const result = experienceBlockSchema.safeParse(updatedData)
      const newErrors: ValidationErrors = {}
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          newErrors[issue.path[0] as string] = issue.message
        })
      }
      setErrors(newErrors)
    },
    [experienceData]
  )

  const handleFieldChange = useCallback(
    (
      field: keyof Omit<
        ExperienceBlockData,
        | ExperienceBlockFields.START_DATE
        | ExperienceBlockFields.END_DATE
        | ExperienceBlockFields.BULLET_POINTS
      >,
      value: string
    ): void => {
      if (experienceData[field] === value) return
      const updatedData = { ...experienceData, [field]: value }
      setExperienceData(updatedData)
      onUpdate(id, updatedData)
      validateField(field, value)
    },
    [experienceData, id, onUpdate, validateField]
  )

  const handleDateChange = useCallback(
    (
      field: ExperienceBlockFields.START_DATE | ExperienceBlockFields.END_DATE,
      key: 'month' | 'year',
      value: string
    ) => {
      if (experienceData[field][key] === value) return
      const updatedData = {
        ...experienceData,
        [field]: {
          ...experienceData[field],
          [key]: value,
          ...(field === ExperienceBlockFields.END_DATE && { isPresent: false }),
        },
      }
      setExperienceData(updatedData)
      onUpdate(id, updatedData)
      validateField(field, updatedData[field])
    },
    [experienceData, id, onUpdate, validateField]
  )

  const handlePresentChange = useCallback(
    (checked: boolean) => {
      if (experienceData.endDate.isPresent === checked) return
      const updatedEndDate = checked
        ? { month: '' as Month, year: '', isPresent: true }
        : { ...experienceData.endDate, isPresent: false }
      const updatedData = { ...experienceData, endDate: updatedEndDate }
      setExperienceData(updatedData)
      onUpdate(id, updatedData)
      validateField(ExperienceBlockFields.END_DATE, updatedEndDate)
    },
    [experienceData, id, onUpdate, validateField]
  )

  const handleYearInput = useCallback(
    (value: string, setter: (value: string) => void) => {
      if (/^\d{0,4}$/.test(value)) {
        setter(value)
      }
    },
    []
  )

  const handleBulletChange = useCallback(
    (bulletIndex: number, value: string): void => {
      if (experienceData.bulletPoints[bulletIndex] === value) return
      const updatedBullets = [...experienceData.bulletPoints]
      updatedBullets[bulletIndex] = value
      const updatedData = { ...experienceData, bulletPoints: updatedBullets }
      setExperienceData(updatedData)
      onUpdate(id, updatedData)
      validateField(ExperienceBlockFields.BULLET_POINTS, updatedBullets)
    },
    [experienceData, id, onUpdate, validateField]
  )

  const addBullet = useCallback((): void => {
    const updatedBullets = [...experienceData.bulletPoints, '']
    const updatedData = { ...experienceData, bulletPoints: updatedBullets }
    setExperienceData(updatedData)
    onUpdate(id, updatedData)
    validateField(ExperienceBlockFields.BULLET_POINTS, updatedBullets)
  }, [experienceData, id, onUpdate, validateField])

  const deleteBullet = useCallback(
    (bulletIndex: number): void => {
      const updatedBullets = experienceData.bulletPoints.filter(
        (_, i) => i !== bulletIndex
      )
      const updatedData = { ...experienceData, bulletPoints: updatedBullets }
      setExperienceData(updatedData)
      onUpdate(id, updatedData)
      validateField(ExperienceBlockFields.BULLET_POINTS, updatedBullets)
    },
    [experienceData, id, onUpdate, validateField]
  )

  const handleBlockDelete = useCallback(() => {
    onDelete(id)
  }, [id, onDelete])

  useEffect(() => {
    validateField(
      ExperienceBlockFields.JOB_TITLE,
      debouncedExperienceData.jobTitle
    )
    validateField(
      ExperienceBlockFields.COMPANY_NAME,
      debouncedExperienceData.companyName
    )
    validateField(
      ExperienceBlockFields.LOCATION,
      debouncedExperienceData.location
    )
    validateField(
      ExperienceBlockFields.START_DATE,
      debouncedExperienceData.startDate
    )
    validateField(
      ExperienceBlockFields.END_DATE,
      debouncedExperienceData.endDate
    )
    validateField(
      ExperienceBlockFields.BULLET_POINTS,
      debouncedExperienceData.bulletPoints
    )
  }, [debouncedExperienceData, validateField])

  return (
    <section className={styles.experienceBlock}>
      <header className={styles.header}>
        <h3>Experience Block</h3>
        <button
          type='button'
          className={styles.button}
          onClick={handleBlockDelete}
        >
          Delete Block
        </button>
      </header>

      <fieldset className={styles.jobDetails}>
        <div className={styles.field}>
          <label>Job Title</label>
          <input
            type='text'
            className={styles.input}
            value={experienceData.jobTitle}
            onChange={(e) =>
              handleFieldChange(ExperienceBlockFields.JOB_TITLE, e.target.value)
            }
          />
          {errors.jobTitle && (
            <p className={styles.errorMessage}>{errors.jobTitle}</p>
          )}
        </div>

        <div className={styles.field}>
          <label>Company Name</label>
          <input
            type='text'
            className={styles.input}
            value={experienceData.companyName}
            onChange={(e) =>
              handleFieldChange(
                ExperienceBlockFields.COMPANY_NAME,
                e.target.value
              )
            }
          />
          {errors.companyName && (
            <p className={styles.errorMessage}>{errors.companyName}</p>
          )}
        </div>

        <div className={styles.field}>
          <label>Location</label>
          <input
            type='text'
            className={styles.input}
            value={experienceData.location}
            onChange={(e) =>
              handleFieldChange(ExperienceBlockFields.LOCATION, e.target.value)
            }
          />
          {errors.location && (
            <p className={styles.errorMessage}>{errors.location}</p>
          )}
        </div>

        <div className={styles.dateField}>
          <label>Start Date</label>
          <div className={styles.dateInputs}>
            <select
              className={styles.input}
              value={experienceData.startDate.month}
              onChange={(e) =>
                handleDateChange(
                  ExperienceBlockFields.START_DATE,
                  'month',
                  e.target.value
                )
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
              className={styles.input}
              value={experienceData.startDate.year}
              onChange={(e) =>
                handleYearInput(e.target.value, (value) =>
                  handleDateChange(
                    ExperienceBlockFields.START_DATE,
                    'year',
                    value
                  )
                )
              }
              placeholder='YYYY'
              maxLength={4}
              pattern='[0-9]{4}'
            />
          </div>
          {errors.startDate && (
            <p className={styles.errorMessage}>{errors.startDate}</p>
          )}
        </div>

        <div className={styles.dateField}>
          <label>End Date</label>
          <div className={styles.checkboxField}>
            <input
              type='checkbox'
              checked={experienceData.endDate.isPresent}
              onChange={(e) => handlePresentChange(e.target.checked)}
            />
            <label>Present</label>
          </div>
          <div className={styles.dateInputs}>
            <select
              className={styles.input}
              value={experienceData.endDate.month}
              onChange={(e) =>
                handleDateChange(
                  ExperienceBlockFields.END_DATE,
                  'month',
                  e.target.value
                )
              }
              disabled={experienceData.endDate.isPresent}
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
              className={styles.input}
              value={experienceData.endDate.year}
              onChange={(e) =>
                handleYearInput(e.target.value, (value) =>
                  handleDateChange(
                    ExperienceBlockFields.END_DATE,
                    'year',
                    value
                  )
                )
              }
              placeholder='YYYY'
              maxLength={4}
              pattern='[0-9]{4}'
              disabled={experienceData.endDate.isPresent}
            />
          </div>
          {errors.endDate && (
            <p className={styles.errorMessage}>{errors.endDate}</p>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.bulletPoints}>
        <legend>Bullet Points</legend>
        <ul className={styles.bulletList}>
          {experienceData.bulletPoints.map((bullet, bulletIndex) => (
            <li key={bulletIndex} className={styles.bulletItem}>
              <input
                type='text'
                className={styles.input}
                value={bullet}
                onChange={(e) =>
                  handleBulletChange(bulletIndex, e.target.value)
                }
              />
              <button
                type='button'
                className={styles.button}
                onClick={() => deleteBullet(bulletIndex)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <button type='button' className={styles.button} onClick={addBullet}>
          Add Bullet
        </button>
      </fieldset>
    </section>
  )
}

export default memo(ExperienceBlock, arePropsEqual)
