import styles from './EditableProjectBlock.module.scss'
import { Month } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { useDebounce } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { projectBlockSchema } from '@/lib/validationSchemas'
import { months } from '@/lib/constants'
import { JobDescriptionAnalysis } from '@/app/api/analyze-job-description/route'

export interface ProjectBlockData {
  id: string
  title: string
  technologies: string[]
  description: string
  startDate: { month: Month; year: string }
  endDate: { month: Month; year: string; isPresent: boolean }
  bulletPoints: string[]
  link: string
}

interface EditableProjectBlockProps {
  data: ProjectBlockData
  isNew: boolean
  onDelete: (id: string) => void
  onClose: () => void
  onSave: (data: ProjectBlockData) => void
}

enum FieldType {
  TITLE = 'title',
  DESCRIPTION = 'description',
  TECHNOLOGIES = 'technologies',
  START_DATE_MONTH = 'startDate.month',
  START_DATE_YEAR = 'startDate.year',
  END_DATE_IS_PRESENT = 'endDate.isPresent',
  END_DATE_MONTH = 'endDate.month',
  END_DATE_YEAR = 'endDate.year',
  BULLET_POINTS = 'bulletPoints',
  LINK = 'link',
}

const EditableProjectBlock: React.FC<EditableProjectBlockProps> = ({
  data,
  isNew,
  onDelete,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ProjectBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [techInput, setTechInput] = useState('')

  const debouncedFormData = useDebounce(formData, 300)
  const debouncedTouched = useDebounce(touched, 300)

  useEffect(() => {
    setFormData(data)
    setTouched({})
  }, [data])

  const isValid = useMemo(() => {
    return projectBlockSchema.safeParse(formData).success
  }, [formData])

  const errors = useMemo(() => {
    const result = projectBlockSchema.safeParse(debouncedFormData)
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
    (
      field: FieldType,
      value: string | string[] | boolean,
      bulletIndex?: number
    ) => {
      const updateHandlers: Record<
        string,
        (
          prev: ProjectBlockData,
          val: string | string[] | boolean
        ) => ProjectBlockData
      > = {
        [FieldType.TITLE]: (prev, val) => ({
          ...prev,
          title: val as string,
        }),
        [FieldType.DESCRIPTION]: (prev, val) => ({
          ...prev,
          description: val as string,
        }),
        [FieldType.TECHNOLOGIES]: (prev, val) => ({
          ...prev,
          technologies: Array.isArray(val) ? val : prev.technologies,
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
            ? { month: '' as Month, year: '', isPresent: true }
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
        [FieldType.LINK]: (prev, val) => ({
          ...prev,
          link: val as string,
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
    <section className={styles.editableProjectBlock}>
      <header className={styles.header}>
        <button type='button' className={styles.closeButton} onClick={onClose}>
          <FaXmark />
        </button>
      </header>

      <div className={styles.projectDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>Project Title *</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.title}
            onChange={(e) => handleChange(FieldType.TITLE, e.target.value)}
          />
          {debouncedTouched.title && errors.title && (
            <p className={styles.formError}>{errors.title}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Project URL</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.link}
            onChange={(e) => handleChange(FieldType.LINK, e.target.value)}
          />
        </div>
        {debouncedTouched.link && errors.link && (
          <p className={styles.formError}>{errors.link}</p>
        )}

        <div className={styles.formField}>
          <label className={styles.label}>Technologies</label>
          <div className={styles.chipInputContainer}>
            <input
              type='text'
              className={styles.formInput}
              value={techInput || ''}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && techInput.trim()) {
                  e.preventDefault()
                  handleChange(FieldType.TECHNOLOGIES, [
                    ...formData.technologies,
                    techInput.trim(),
                  ])
                  setTechInput('')
                }
              }}
              placeholder='Type and press Enter'
            />
            <button
              type='button'
              className={styles.chipAddButton}
              onClick={() => {
                if (techInput.trim()) {
                  handleChange(FieldType.TECHNOLOGIES, [
                    ...(formData.technologies || []),
                    techInput.trim(),
                  ])
                  setTechInput('')
                }
              }}
            >
              <FaPlus />
            </button>
          </div>

          <div className={styles.chipsContainer}>
            {formData.technologies.map((tech, index) => (
              <div key={index} className={styles.chip}>
                {tech}
                <button
                  type='button'
                  className={styles.removeChip}
                  onClick={() =>
                    handleChange(
                      FieldType.TECHNOLOGIES,
                      formData.technologies.filter((_, i) => i !== index)
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
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

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.formTextarea}
            value={formData.description}
            placeholder='Describe your project in detail. Format however you like.'
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

export default EditableProjectBlock
