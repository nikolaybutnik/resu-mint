import styles from './EditableProjectBlock.module.scss'
import {
  sanitizeResumeBullet,
  sanitizeResumeContent,
  sanitizeUrl,
  useDebounce,
  useDebouncedCallback,
} from '@/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { projectBlockSchema } from '@/lib/validationSchemas'
import { months } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'
import { BulletPoint as BulletPointComponent } from '@/components/shared/BulletPoint/BulletPoint'
import { BulletPoint, Month, ProjectBlockData } from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'

interface EditableProjectBlockProps {
  data: ProjectBlockData
  isNew: boolean
  settings: AppSettings
  onDelete: (id: string) => void
  onClose: () => void
  onSave: (data: ProjectBlockData) => void
}

type ErrorKey = 'bulletEmpty' | 'bulletTooLong'

type ValidationErrors = {
  [K in ErrorKey]?: string[]
}

const FieldType = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  TECHNOLOGIES: 'technologies',
  START_DATE_MONTH: 'startDate.month',
  START_DATE_YEAR: 'startDate.year',
  END_DATE_IS_PRESENT: 'endDate.isPresent',
  END_DATE_MONTH: 'endDate.month',
  END_DATE_YEAR: 'endDate.year',
  BULLET_POINTS: 'bulletPoints',
  LINK: 'link',
} as const

const EditableProjectBlock: React.FC<EditableProjectBlockProps> = ({
  data,
  isNew,
  settings,
  onDelete,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ProjectBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [techInput, setTechInput] = useState('')
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(
    null
  )
  const [editingBulletText, setEditingBulletText] = useState<string>('')
  const [bulletPointErrors, setBulletPointErrors] = useState<
    ValidationErrors[]
  >(data.bulletPoints.map(() => ({})))
  const [temporaryBulletId, setTemporaryBulletId] = useState<string | null>(
    null
  )

  const debouncedFormData = useDebounce(formData, 300)
  const debouncedTouched = useDebounce(touched, 300)

  useEffect(() => {
    setFormData(data)
    setTouched({})
    setEditingBulletIndex(null)
    setEditingBulletText('')
    setBulletPointErrors(data.bulletPoints.map(() => ({})))
  }, [data])

  const isValid = useMemo(() => {
    return projectBlockSchema.safeParse(formData).success
  }, [formData])

  const fieldErrors = useMemo(() => {
    const result = projectBlockSchema.safeParse(debouncedFormData)
    if (result.success) {
      return {}
    }
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      if (!path.startsWith('bulletPoints.')) {
        errors[path] = issue.message
      }
    })
    return errors
  }, [debouncedFormData])

  const validateBulletText = useDebouncedCallback(
    (text: string, index: number) => {
      const newErrors: ValidationErrors = {}

      if (text.trim() === '') {
        newErrors.bulletEmpty = ['Bullet text cannot be empty']
      }

      if (text.length > settings.maxCharsPerBullet) {
        newErrors.bulletTooLong = [
          `Your char limit is set to ${settings.maxCharsPerBullet}. For best results, keep each bullet consistent in length.`,
        ]
      }

      setBulletPointErrors((prev) => {
        const updated = [...prev]
        updated[index] = newErrors
        return updated
      })
    },
    300
  )

  const sanitizeYear = useCallback(
    (val: string) => val.replace(/[^0-9]/g, '').slice(0, 4),
    []
  )

  const handleChange = useCallback(
    (
      field: (typeof FieldType)[keyof typeof FieldType],
      value: string | string[] | boolean | BulletPoint,
      bulletIndex?: number
    ) => {
      const updateHandlers: Record<
        string,
        (
          prev: ProjectBlockData,
          val: string | string[] | boolean | BulletPoint
        ) => ProjectBlockData
      > = {
        [FieldType.TITLE]: (prev, val) => ({
          ...prev,
          title: val as string,
        }),
        [FieldType.DESCRIPTION]: (prev, val) => ({
          ...prev,
          description: sanitizeResumeContent(val as string, true),
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
          link: sanitizeUrl(val as string),
        }),
      }

      setFormData((prev) => {
        if (field === FieldType.BULLET_POINTS && bulletIndex !== undefined) {
          return {
            ...prev,
            bulletPoints: prev.bulletPoints.map((bullet, index) =>
              index === bulletIndex
                ? {
                    id: bullet.id,
                    text: sanitizeResumeBullet(value as string, true),
                  }
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
    const newBullet = { id: uuidv4(), text: '' }
    setTemporaryBulletId(newBullet.id)
    setFormData((prev) => ({
      ...prev,
      bulletPoints: [...prev.bulletPoints, newBullet],
    }))
    setBulletPointErrors((prev) => [...prev, {}])
    setEditingBulletIndex(formData.bulletPoints.length)
    setEditingBulletText('')
  }, [formData.bulletPoints.length, temporaryBulletId])

  const handleBulletDelete = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      bulletPoints: prev.bulletPoints.filter((_, i) => i !== index),
    }))
    setBulletPointErrors((prev) => prev.filter((_, i) => i !== index))
    setTouched((prev) => {
      const updated = { ...prev }
      delete updated[`bulletPoints.${index}`]
      return updated
    })
    setEditingBulletIndex(null)
    setEditingBulletText('')
  }, [])

  const handleBulletSave = useCallback(() => {
    if (editingBulletIndex !== null) {
      const sanitized = sanitizeResumeBullet(editingBulletText, true)
      if (sanitized.trim() !== '') {
        handleChange(FieldType.BULLET_POINTS, sanitized, editingBulletIndex)
        setBulletPointErrors((prev) => {
          const updated = [...prev]
          updated[editingBulletIndex] = {}
          return updated
        })
        setEditingBulletIndex(null)
        setEditingBulletText('')
        setTemporaryBulletId(null)
      } else {
        setBulletPointErrors((prev) => {
          const updated = [...prev]
          updated[editingBulletIndex] = {
            bulletEmpty: ['Bullet text cannot be empty'],
          }
          return updated
        })
      }
    }
  }, [editingBulletIndex, editingBulletText, handleChange])

  const handleEditBullet = useCallback(
    (index: number) => {
      setEditingBulletIndex(index)
      setEditingBulletText(formData.bulletPoints[index].text)
    },
    [formData.bulletPoints]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingBulletIndex(null)
    setEditingBulletText('')

    if (temporaryBulletId) {
      setFormData((prev) => ({
        ...prev,
        bulletPoints: prev.bulletPoints.filter(
          (bullet) => bullet.id !== temporaryBulletId
        ),
      }))
      setBulletPointErrors((prev) => prev.slice(0, -1))
      setTemporaryBulletId(null)
    }

    if (editingBulletIndex !== null) {
      setBulletPointErrors((prev) => {
        const updated = [...prev]
        updated[editingBulletIndex] = {}
        return updated
      })
    }
  }, [editingBulletIndex])

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const sanitized = sanitizeResumeBullet(e.target.value, false)
      setEditingBulletText(sanitized)
      if (editingBulletIndex !== null) {
        validateBulletText(sanitized, editingBulletIndex)
      }
    },
    [editingBulletIndex, validateBulletText]
  )

  const handleDelete = useCallback(() => {
    // temporary confirmation window
    if (
      window.confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
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
    <section className={styles.editableProjectBlock}>
      <header className={styles.header}>
        {!isNew && (
          <button
            type='button'
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
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
          {debouncedTouched.title && fieldErrors.title && (
            <p className={styles.formError}>{fieldErrors.title}</p>
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
          {debouncedTouched.link && fieldErrors.link && (
            <p className={styles.formError}>{fieldErrors.link}</p>
          )}
        </div>

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
                  <FaXmark />
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
            fieldErrors[FieldType.START_DATE_MONTH] && (
              <p className={styles.formError}>
                {fieldErrors[FieldType.START_DATE_MONTH]}
              </p>
            )}
          {debouncedTouched[FieldType.START_DATE_YEAR] &&
            fieldErrors[FieldType.START_DATE_YEAR] && (
              <p className={styles.formError}>
                {fieldErrors[FieldType.START_DATE_YEAR]}
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

          {debouncedTouched['endDate.month'] &&
            fieldErrors['endDate.month'] && (
              <p className={styles.formError}>{fieldErrors['endDate.month']}</p>
            )}
          {debouncedTouched['endDate.year'] && fieldErrors['endDate.year'] && (
            <p className={styles.formError}>{fieldErrors['endDate.year']}</p>
          )}
          {debouncedTouched.endDate && fieldErrors.endDate && (
            <p className={styles.formError}>{fieldErrors.endDate}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.formTextarea}
            value={formData.description}
            rows={4}
            maxLength={1000}
            placeholder='Describe your project in detail. Format however you like.'
            onChange={(e) =>
              handleChange(FieldType.DESCRIPTION, e.target.value)
            }
          />
        </div>
      </div>

      <div className={styles.bulletPoints}>
        <div className={styles.bulletHeader}>
          <h3>Bullet Points</h3>
          <button
            type='button'
            className={styles.addButton}
            onClick={handleAddBulletPoint}
          >
            <FaPlus /> Add
          </button>
        </div>
        <div>
          {formData.bulletPoints.map((bullet, index) => (
            <BulletPointComponent
              key={bullet.id}
              text={bullet.text}
              editingText={editingBulletText}
              index={index}
              isRegenerating={false}
              isEditing={editingBulletIndex === index}
              disableAllControls={
                editingBulletIndex !== null && editingBulletIndex !== index
              }
              errors={bulletPointErrors[index] || {}}
              settings={settings}
              onCancelEdit={handleCancelEdit}
              onBulletDelete={handleBulletDelete}
              onBulletSave={handleBulletSave}
              onEditBullet={() => handleEditBullet(index)}
              onRegenerateBullet={() => {}}
              onTextareaChange={handleTextareaChange}
            />
          ))}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button
          type='button'
          className={styles.saveButton}
          onClick={handleSave}
          disabled={!isValid || editingBulletIndex !== null}
        >
          Save
        </button>
      </div>
    </section>
  )
}

export default EditableProjectBlock
