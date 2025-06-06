import React, { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { useDebounce } from '@/lib/utils'
import { FaXmark } from 'react-icons/fa6'
import { months, TOUCH_DELAY, VALIDATION_DELAY } from '@/lib/constants'
import { educationBlockSchema } from '@/lib/validationSchemas'
import { Month, EducationBlockData, DegreeStatus } from '@/lib/types/education'
import { isEqual } from 'lodash'

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
    <section>
      <header>
        {!isNew && (
          <button type='button' onClick={handleDelete}>
            Delete
          </button>
        )}
        <button type='button' onClick={onClose}>
          <FaXmark />
        </button>
      </header>

      <div>
        <div>
          <label>Institution *</label>
          <input
            type='text'
            value={formData.institution}
            onChange={(e) =>
              handleChange(FieldType.INSTITUTION, e.target.value)
            }
          />
          {debouncedTouched.institution && fieldErrors.invalidInstitution && (
            <p>{fieldErrors.invalidInstitution[0]}</p>
          )}
        </div>

        <div>
          <label>Degree *</label>
          <input
            type='text'
            value={formData.degree}
            onChange={(e) => handleChange(FieldType.DEGREE, e.target.value)}
          />
          {debouncedTouched.degree && fieldErrors.invalidDegree && (
            <p>{fieldErrors.invalidDegree[0]}</p>
          )}
        </div>

        <div>
          <label>Degree Status *</label>
          <select
            value={formData.degreeStatus}
            onChange={(e) =>
              handleChange(FieldType.DEGREE_STATUS, e.target.value)
            }
          >
            <option value=''>Select Status</option>
            <option value={DegreeStatus.COMPLETED}>Completed</option>
            <option value={DegreeStatus.IN_PROGRESS}>In Progress</option>
            <option value={DegreeStatus.EXPECTED}>Expected</option>
          </select>
          {debouncedTouched.degreeStatus && fieldErrors.invalidDegreeStatus && (
            <p>{fieldErrors.invalidDegreeStatus[0]}</p>
          )}
        </div>

        <div>
          <label>Location</label>
          <input
            type='text'
            value={formData.location || ''}
            onChange={(e) => handleChange(FieldType.LOCATION, e.target.value)}
          />
          {debouncedTouched.location && fieldErrors.invalidLocation && (
            <p>{fieldErrors.invalidLocation[0]}</p>
          )}
        </div>

        {formData.startDate && (
          <div>
            <label>Start Date</label>
            <div>
              <select
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
              <p>{fieldErrors.invalidStartDateMonth[0]}</p>
            )}
            {debouncedTouched[FieldType.START_DATE_YEAR] &&
              fieldErrors.invalidStartDateYear && (
                <p>{fieldErrors.invalidStartDateYear[0]}</p>
              )}
          </div>
        )}

        {formData.endDate && (
          <div>
            <label>End Date</label>
            <div>
              <select
                value={formData.endDate.month || ''}
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
                placeholder='YYYY'
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
            <div>
              <input
                type='checkbox'
                checked={formData.endDate.isPresent}
                onChange={(e) =>
                  handleChange(FieldType.END_DATE_IS_PRESENT, e.target.checked)
                }
              />
              <label>Expected/Current</label>
            </div>
            {fieldErrors.invalidEndDateMonth && (
              <p>{fieldErrors.invalidEndDateMonth[0]}</p>
            )}
            {debouncedTouched['endDate.year'] &&
              fieldErrors.invalidEndDateYear && (
                <p>{fieldErrors.invalidEndDateYear[0]}</p>
              )}
            {debouncedTouched.endDate && fieldErrors.invalidEndDate && (
              <p>{fieldErrors.invalidEndDate[0]}</p>
            )}
          </div>
        )}

        <div>
          <label>Description</label>
          <textarea
            value={formData.description || ''}
            rows={4}
            maxLength={2000}
            placeholder='Describe your education experience, achievements, relevant coursework, etc.'
            onChange={(e) =>
              handleChange(FieldType.DESCRIPTION, e.target.value)
            }
          />
          {debouncedTouched.description && fieldErrors.invalidDescription && (
            <p>{fieldErrors.invalidDescription[0]}</p>
          )}
        </div>
      </div>

      <div>
        <button type='button' onClick={handleSave} disabled={!isValid}>
          Save
        </button>
      </div>
    </section>
  )
}

export default memo(EditableEducationBlock)
