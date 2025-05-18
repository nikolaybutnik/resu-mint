import styles from './EditableProjectBlock.module.scss'
import { sanitizeResumeContent, useDebounce } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { projectBlockSchema } from '@/lib/validationSchemas'
import { months, TOUCH_DELAY, VALIDATION_DELAY } from '@/lib/constants'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import {
  BulletPoint as BulletPointType,
  Month,
  ProjectBlockData,
} from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'
import { isEqual } from 'lodash'
import { BulletPointErrors } from '@/lib/types/errors'

interface EditableProjectBlockProps {
  data: ProjectBlockData
  isNew: boolean
  editingBulletIndex: number | null
  editingBulletText: string
  bulletErrors: BulletPointErrors
  settings: AppSettings
  isRegenerating: boolean
  regeneratingBullet: { section: string; index: number } | null
  onDelete: (id: string) => void
  onClose: () => void
  onSave: (data: ProjectBlockData) => void
  onRegenerateBullet: (sectionId: string, index: number) => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
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
}) => {
  const [formData, setFormData] = useState<ProjectBlockData>(data)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<
    ValidationErrors<FieldErrorKey>
  >({})
  const [techInput, setTechInput] = useState('')

  const debouncedFormData = useDebounce(formData, VALIDATION_DELAY)
  const debouncedTouched = useDebounce(touched, TOUCH_DELAY) // Ensures validation runs before showing errors

  useEffect(() => {
    // Clear form only on init or when project changes
    if (!formData || formData.id !== data.id) {
      setFormData(data)
      setTouched({})
      setFieldErrors({})
    } else {
      // If project unchanged, just update bullets
      setFormData((prevFormData) => ({
        ...prevFormData,
        bulletPoints: data.bulletPoints,
      }))
    }
  }, [data])

  useEffect(() => {
    const result = projectBlockSchema.safeParse(debouncedFormData)
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
            case 'link':
              errors.invalidLink = [issue.message]
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
        }
      })
    setFieldErrors((prev) => (isEqual(prev, errors) ? prev : errors))
  }, [debouncedFormData])

  const isValid = useMemo(() => {
    return projectBlockSchema.safeParse(formData).success
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
                  }
                : bullet
            ),
          }
        }

        const updateHandlers: Record<
          string,
          (
            prev: ProjectBlockData,
            val: string | string[] | boolean | BulletPointType
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
            link: val as string,
          }),
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
    [sanitizeYear]
  )

  const handleDelete = useCallback(() => {
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

  const emptyBulletErrors = useMemo(() => ({}), [])
  const combinedBulletErrors = useMemo(
    () =>
      formData.bulletPoints.map((_, index) =>
        editingBulletIndex === index ? bulletErrors : emptyBulletErrors
      ),
    [bulletErrors, editingBulletIndex, formData.bulletPoints, emptyBulletErrors]
  )

  return (
    <section className={styles.editableProjectBlock}>
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

      <div className={styles.projectDetails}>
        <div className={styles.formField}>
          <label className={styles.label}>Project Title *</label>
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
          <label className={styles.label}>Project URL</label>
          <input
            type='text'
            className={styles.formInput}
            value={formData.link}
            onChange={(e) => handleChange(FieldType.LINK, e.target.value)}
          />
          {debouncedTouched.link && fieldErrors.invalidLink && (
            <p className={styles.formError}>{fieldErrors.invalidLink[0]}</p>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Technologies</label>
          <div className={styles.chipInputContainer}>
            <input
              type='text'
              className={styles.formInput}
              value={techInput}
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
                    ...formData.technologies,
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
            placeholder='Describe your project in detail. Format however you like.'
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
            disabled={isRegenerating}
          >
            <FaPlus /> Add
          </button>
        </div>
        <div>
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
                onCancelEdit={onBulletCancel}
                onBulletDelete={(index) => onBulletDelete(formData.id, index)}
                onBulletSave={onBulletSave}
                onEditBullet={(index) => onEditBullet(formData.id, index)}
                onRegenerateBullet={(sectionId, index) =>
                  onRegenerateBullet(sectionId, index)
                }
                onTextareaChange={onTextareaChange}
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

export default EditableProjectBlock
