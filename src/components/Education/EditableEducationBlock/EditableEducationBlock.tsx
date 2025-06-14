import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { useDebounce } from '@/lib/clientUtils'
import { FaXmark } from 'react-icons/fa6'
import { months, TOUCH_DELAY, VALIDATION_DELAY } from '@/lib/constants'
import { educationBlockSchema } from '@/lib/validationSchemas'
import { Month, EducationBlockData, DegreeStatus } from '@/lib/types/education'
import { isEqual } from 'lodash'
import styles from './EditableEducationBlock.module.scss'

interface EditableEducationBlockProps {
  data: EducationBlockData
  isNew: boolean
  onDelete: (id: string) => void
  onClose: () => void
  onSave: (data: EducationBlockData) => void
}

type FieldErrorKey =
  | 'invalidInstitution'
  | 'invalidDegree'
  | 'invalidDegreeStatus'
  | 'invalidLocation'
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
  INSTITUTION: 'institution',
  DEGREE: 'degree',
  DEGREE_STATUS: 'degreeStatus',
  LOCATION: 'location',
  DESCRIPTION: 'description',
  START_DATE_MONTH: 'startDate.month',
  START_DATE_YEAR: 'startDate.year',
  END_DATE_IS_PRESENT: 'endDate.isPresent',
  END_DATE_MONTH: 'endDate.month',
  END_DATE_YEAR: 'endDate.year',
} as const

const EditableEducationBlock: React.FC<EditableEducationBlockProps> = ({
  data,
  isNew,
  onDelete,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<EducationBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<
    ValidationErrors<FieldErrorKey>
  >({})

  const debouncedFormData = useDebounce(formData, VALIDATION_DELAY)
  const debouncedTouched = useDebounce(touched, TOUCH_DELAY)

  useEffect(() => {
    setFormData(data)
  }, [])

  useEffect(() => {
    const result = educationBlockSchema.safeParse(debouncedFormData)
    if (result.success) {
      setFieldErrors({})
      return
    }

    const errors: ValidationErrors<FieldErrorKey> = {}
    result.error.issues
      .filter((issue) => issue.message !== '')
      .forEach((issue) => {
        const path = issue.path.join('.')
        switch (path) {
          case 'institution':
            errors.invalidInstitution = [issue.message]
            break
          case 'degree':
            errors.invalidDegree = [issue.message]
            break
          case 'degreeStatus':
            errors.invalidDegreeStatus = [issue.message]
            break
          case 'location':
            errors.invalidLocation = [issue.message]
            break
          case 'description':
            errors.invalidDescription = [issue.message]
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
      })
    setFieldErrors((prev) => (isEqual(prev, errors) ? prev : errors))
  }, [debouncedFormData])

  const isValid = useMemo(() => {
    return educationBlockSchema.safeParse(formData).success
  }, [formData])

  const sanitizeYear = useCallback(
    (val: string) => val.replace(/[^0-9]/g, '').slice(0, 4),
    []
  )

  const handleChange = useCallback(
    (
      field: (typeof FieldType)[keyof typeof FieldType],
      value: string | boolean
    ) => {
      setFormData((prev) => {
        const updateHandlers: Record<
          string,
          (
            prev: EducationBlockData,
            val: string | boolean
          ) => EducationBlockData
        > = {
          [FieldType.INSTITUTION]: (prev, val) => ({
            ...prev,
            institution: val as string,
          }),
          [FieldType.DEGREE]: (prev, val) => ({
            ...prev,
            degree: val as string,
          }),
          [FieldType.DEGREE_STATUS]: (prev, val) => ({
            ...prev,
            degreeStatus: val as DegreeStatus,
          }),
          [FieldType.LOCATION]: (prev, val) => ({
            ...prev,
            location: val as string,
          }),
          [FieldType.DESCRIPTION]: (prev, val) => ({
            ...prev,
            description: val as string,
          }),
          [FieldType.START_DATE_MONTH]: (prev, val) => ({
            ...prev,
            startDate: prev.startDate
              ? { ...prev.startDate, month: val as Month }
              : { month: val as Month, year: '' },
          }),
          [FieldType.START_DATE_YEAR]: (prev, val) => ({
            ...prev,
            startDate: prev.startDate
              ? { ...prev.startDate, year: sanitizeYear(val as string) }
              : { month: '', year: sanitizeYear(val as string) },
          }),
          [FieldType.END_DATE_IS_PRESENT]: (prev, val) => ({
            ...prev,
            endDate: val
              ? { month: '', year: '', isPresent: true }
              : prev.endDate
              ? { ...prev.endDate, isPresent: false }
              : { month: '', year: '', isPresent: false },
          }),
          [FieldType.END_DATE_MONTH]: (prev, val) => ({
            ...prev,
            endDate: prev.endDate
              ? { ...prev.endDate, month: val as Month, isPresent: false }
              : { month: val as Month, year: '', isPresent: false },
          }),
          [FieldType.END_DATE_YEAR]: (prev, val) => ({
            ...prev,
            endDate: prev.endDate
              ? {
                  ...prev.endDate,
                  year: sanitizeYear(val as string),
                  isPresent: false,
                }
              : {
                  month: '',
                  year: sanitizeYear(val as string),
                  isPresent: false,
                },
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
        'Are you sure you want to delete this education entry? This action cannot be undone.'
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

  return (
    <section className={styles.editableEducationBlock}>
      <header className={styles.header}>
        {!isNew && (
          <button
            type='button'
            onClick={handleDelete}
            className={styles.deleteButton}
          >
            Delete
          </button>
        )}
        <button type='button' onClick={onClose} className={styles.closeButton}>
          <FaXmark />
        </button>
      </header>

      <div>
        <div className={styles.formField}>
          <label className={styles.label}>Institution *</label>
          <input
            type='text'
            className={styles.formInput}
            placeholder='Enter institution name'
            value={formData.institution}
            onChange={(e) =>
              handleChange(FieldType.INSTITUTION, e.target.value)
            }
          />
          {debouncedTouched.institution && fieldErrors.invalidInstitution && (
            <p className={styles.formError}>
              {fieldErrors.invalidInstitution[0]}
            </p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Degree *</label>
          <input
            type='text'
            className={styles.formInput}
            placeholder='Enter degree name'
            value={formData.degree}
            onChange={(e) => handleChange(FieldType.DEGREE, e.target.value)}
          />
          {debouncedTouched.degree && fieldErrors.invalidDegree && (
            <p className={styles.formError}>{fieldErrors.invalidDegree[0]}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Degree Status</label>
          <select
            className={styles.formInput}
            value={formData.degreeStatus}
            onChange={(e) =>
              handleChange(FieldType.DEGREE_STATUS, e.target.value)
            }
          >
            <option value=''>Select Status</option>
            <option value={DegreeStatus.COMPLETED}>Completed</option>
            <option value={DegreeStatus.IN_PROGRESS}>In Progress</option>
          </select>
          {debouncedTouched.degreeStatus && fieldErrors.invalidDegreeStatus && (
            <p className={styles.formError}>
              {fieldErrors.invalidDegreeStatus[0]}
            </p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Location</label>
          <input
            type='text'
            className={styles.formInput}
            placeholder='Enter location'
            value={formData.location || ''}
            onChange={(e) => handleChange(FieldType.LOCATION, e.target.value)}
          />
          {debouncedTouched.location && fieldErrors.invalidLocation && (
            <p className={styles.formError}>{fieldErrors.invalidLocation[0]}</p>
          )}
        </div>

        {formData.startDate && (
          <div className={styles.formField}>
            <label className={styles.label}>Start Date</label>
            <div className={styles.dateInputs}>
              <select
                className={`${styles.formInput} ${styles.monthInput}`}
                value={formData.startDate.month || ''}
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
                className={`${styles.formInput} ${styles.yearInput}`}
                placeholder='YYYY'
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
        )}

        {formData.endDate && (
          <div className={styles.formField}>
            <label className={styles.label}>End Date</label>
            <div className={styles.dateInputs}>
              <select
                className={`${styles.formInput} ${styles.monthInput}`}
                value={formData.endDate.month || ''}
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
                className={`${styles.formInput} ${styles.yearInput}`}
                placeholder='YYYY'
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
              <p className={styles.formError}>
                {fieldErrors.invalidEndDate[0]}
              </p>
            )}
          </div>
        )}

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.formTextarea}
            value={formData.description || ''}
            rows={4}
            maxLength={2000}
            placeholder='Describe your education experience, achievements, relevant coursework, etc.'
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

      <div className={styles.actionButtons}>
        <button
          type='button'
          onClick={handleSave}
          disabled={!isValid}
          className={styles.saveButton}
        >
          Save
        </button>
      </div>
    </section>
  )
}

export default memo(EditableEducationBlock)
