import styles from './EditableProjectBlock.module.scss'
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { MONTHS, PROJECT_FORM_DATA_KEYS } from '@/lib/constants'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { ProjectBlockData, ProjectFormState } from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'
import { BulletPointErrors } from '@/lib/types/errors'
import { KeywordData } from '@/lib/types/keywords'
import { useAutoResizeTextarea } from '@/lib/hooks'
import { submitProject } from '@/lib/actions/projectActions'
import { useFormStatus } from 'react-dom'

interface EditableProjectBlockProps {
  data: ProjectBlockData
  isNew: boolean
  editingBulletIndex: number | null
  editingBulletText: string
  bulletErrors: BulletPointErrors
  settings: AppSettings
  isRegenerating: boolean
  regeneratingBullet: { section: string; index: number } | null
  keywordData: KeywordData | null
  onDelete: (id: string) => void
  onClose: (() => void) | undefined
  onSave: (data: ProjectBlockData) => void
  onRegenerateBullet: (
    sectionId: string,
    index: number,
    formData?: ProjectBlockData,
    shouldSave?: boolean
  ) => void
  onAddBullet: (sectionId: string) => void
  onEditBullet: (sectionId: string, index: number) => void
  onBulletSave: () => void
  onBulletCancel: () => void
  onBulletDelete: (sectionId: string, index: number) => void
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onLockToggle: (sectionId: string, index: number) => void
}

const EditableProjectBlock: React.FC<EditableProjectBlockProps> = ({
  data,
  isNew,
  settings,
  isRegenerating,
  editingBulletIndex,
  editingBulletText,
  bulletErrors,
  regeneratingBullet,
  keywordData,
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
}) => {
  const [state, formAction] = useActionState(
    (prevState: ProjectFormState, formData: FormData): ProjectFormState =>
      submitProject(prevState, formData, onSave, data.bulletPoints),
    {
      errors: {},
      data,
    } as ProjectFormState
  )
  const [techInput, setTechInput] = useState('')
  const [technologies, setTechnologies] = useState<string[]>(
    state.data?.technologies || []
  )
  const [isCurrent, setIsCurrent] = useState(
    state.data?.endDate?.isPresent || false
  )
  const [description, setDescription] = useState(state.data?.description || '')

  useEffect(() => {
    setIsCurrent(state.data?.endDate?.isPresent || false)
  }, [state.data?.endDate?.isPresent])

  useEffect(() => {
    setDescription(state.data?.description || '')
  }, [state.data?.description])

  const {
    textareaRef,
    handleChange: handleTextareaChange,
    handleInput,
  } = useAutoResizeTextarea(description)

  const normalizeTechnology = useCallback((tech: string): string => {
    return tech.trim().toLowerCase().replace(/\s+/g, ' ')
  }, [])

  const isTechDuplicate = useMemo(() => {
    if (!techInput.trim()) return false
    return technologies.some(
      (tech) => normalizeTechnology(tech) === normalizeTechnology(techInput)
    )
  }, [techInput, technologies, normalizeTechnology])

  const handleAddTechnology = useCallback(() => {
    const trimmedTech = techInput.trim()
    if (!trimmedTech || isTechDuplicate) return

    setTechnologies((prev) => [...prev, trimmedTech])
    setTechInput('')
  }, [techInput, isTechDuplicate])

  const getDuplicateTechnology = useCallback(
    (input: string, techList: string[]): string | null => {
      if (!input.trim()) return null
      const normalizedInput = normalizeTechnology(input)
      return (
        techList.find(
          (tech) => normalizeTechnology(tech) === normalizedInput
        ) || null
      )
    },
    [normalizeTechnology]
  )

  const duplicateTechnology = getDuplicateTechnology(techInput, technologies)

  const handleDelete = (): void => {
    if (
      window.confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      )
    ) {
      onDelete(data.id)
    }
  }

  const handleRegenerateBullet = useCallback(
    (sectionId: string, index: number) => {
      if (sectionId === data.id) {
        onRegenerateBullet(sectionId, index, data, true)
      }
    },
    [data.id, data, onRegenerateBullet]
  )

  // TODO: this will be useful when saving data gets tied to a database. Add a loading indicator
  const SubmitButton: React.FC = () => {
    const { pending } = useFormStatus()

    return (
      <button type='submit' className={styles.saveButton} disabled={pending}>
        Save
      </button>
    )
  }

  return (
    <section className={styles.editableProjectBlock}>
      <div className={styles.header}>
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
        {onClose && (
          <button
            type='button'
            className={styles.closeButton}
            onClick={onClose}
          >
            <FaXmark />
          </button>
        )}
      </div>

      <div className={styles.requiredFieldsNote}>
        <span className={styles.requiredIndicator}>*</span>
        Indicates a required field
      </div>

      <form action={formAction} className={styles.projectDetails}>
        {/* Hidden input synced with technologies state to send technologies array to form action */}
        <input
          type='hidden'
          name={PROJECT_FORM_DATA_KEYS.TECHNOLOGIES}
          value={technologies.join(',')}
        />

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Project Name
          </label>
          <input
            type='text'
            name={PROJECT_FORM_DATA_KEYS.TITLE}
            className={`${styles.formInput} ${
              state?.errors?.title ? styles.error : ''
            }`}
            defaultValue={state.data?.title}
            placeholder='Enter the name of your project'
          />
          {state?.errors?.title && (
            <span className={styles.formError}>{state.errors.title}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Project URL</label>
          <input
            type='text'
            name={PROJECT_FORM_DATA_KEYS.LINK}
            className={`${styles.formInput} ${
              state?.errors?.link ? styles.error : ''
            }`}
            defaultValue={state.data?.link}
            placeholder='Enter the URL of your project'
          />
          {state?.errors?.link && (
            <span className={styles.formError}>{state.errors.link}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Tools & Technologies</label>
          <div className={styles.chipInputContainer}>
            <input
              type='text'
              className={styles.formInput}
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && techInput.trim()) {
                  e.preventDefault()
                  handleAddTechnology()
                }
              }}
              placeholder='Type and press Enter'
            />
            <button
              type='button'
              className={styles.chipAddButton}
              onClick={handleAddTechnology}
              disabled={!techInput.trim() || isTechDuplicate}
            >
              <FaPlus />
            </button>
          </div>

          <div className={styles.chipsContainer}>
            {technologies.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Enter the technologies you used in this project.</p>
              </div>
            ) : (
              technologies.map((tech: string, index: number) => (
                <div
                  key={index}
                  className={`${styles.chip} ${
                    duplicateTechnology === tech ? styles.duplicate : ''
                  }`}
                >
                  <span className={styles.skillText}>{tech}</span>
                  <button
                    type='button'
                    className={styles.removeChip}
                    onClick={() => {
                      setTechnologies((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }}
                    title='Remove technology'
                  >
                    <FaXmark />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Start Date
          </label>
          <div className={styles.dateInputs}>
            <select
              key={state.data?.startDate?.month} // Force re-render, selects are not re-rendered when defaultValue changes.
              name={PROJECT_FORM_DATA_KEYS.START_DATE_MONTH}
              className={[styles.formInput, styles.monthInput].join(' ')}
              defaultValue={state.data?.startDate?.month || ''}
            >
              <option value=''>Month</option>
              {MONTHS.map((month) => (
                <option key={month.label} value={month.label}>
                  {month.label}
                </option>
              ))}
            </select>
            <input
              type='text'
              name={PROJECT_FORM_DATA_KEYS.START_DATE_YEAR}
              placeholder='YYYY'
              className={[styles.formInput, styles.yearInput].join(' ')}
              defaultValue={state.data?.startDate?.year || ''}
              maxLength={4}
              onInput={(e) => {
                const value = e.currentTarget.value
                if (!/^\d{0,4}$/.test(value)) {
                  e.currentTarget.value = value
                    .replace(/[^0-9]/g, '')
                    .slice(0, 4)
                }
              }}
            />
          </div>
          {state?.errors?.startDate && (
            <span className={styles.formError}>{state.errors.startDate}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            End Date
          </label>
          <div className={styles.dateInputs}>
            <select
              key={state.data?.endDate?.month}
              name={PROJECT_FORM_DATA_KEYS.END_DATE_MONTH}
              className={[styles.formInput, styles.monthInput].join(' ')}
              defaultValue={state.data?.endDate?.month || ''}
              disabled={isCurrent}
            >
              <option value=''>Month</option>
              {MONTHS.map((month) => (
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
              defaultValue={state.data?.endDate?.year || ''}
              disabled={isCurrent}
              maxLength={4}
              onInput={(e) => {
                const value = e.currentTarget.value
                if (!/^\d{0,4}$/.test(value)) {
                  e.currentTarget.value = value
                    .replace(/[^0-9]/g, '')
                    .slice(0, 4)
                }
              }}
            />
          </div>
          <div className={styles.checkboxField}>
            <input
              type='checkbox'
              name={PROJECT_FORM_DATA_KEYS.END_DATE_IS_PRESENT}
              value='true'
              defaultChecked={state.data?.endDate?.isPresent || false}
              key={`checkbox-${state.data?.endDate?.isPresent}`} // Force re-render when state changes
              onChange={(e) => {
                setIsCurrent(e.target.checked)
              }}
            />
            <label className={styles.checkboxLabel}>
              Currently Working on this Project
            </label>
          </div>
          {state?.errors?.endDate && (
            <span className={styles.formError}>{state.errors.endDate}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Description</label>
          <textarea
            ref={textareaRef}
            name={PROJECT_FORM_DATA_KEYS.DESCRIPTION}
            className={styles.formTextarea}
            value={description}
            rows={4}
            placeholder='Describe your project in detail. Focus on listing your responsibilities, achievements, and the tools you used.'
            onChange={(e) => {
              const newValue = handleTextareaChange(e)
              setDescription(newValue)
            }}
            onInput={handleInput}
          />
          {state?.errors?.description && (
            <span className={styles.formError}>{state.errors.description}</span>
          )}
        </div>

        <div className={styles.actionButtons}>
          <SubmitButton />
        </div>
      </form>

      <div className={styles.bulletPoints}>
        <div className={styles.bulletHeader}>
          <h3>Bullet Points</h3>
          <button
            type='button'
            className={styles.addButton}
            onClick={() => onAddBullet(data.id)}
            disabled={isRegenerating}
          >
            <FaPlus /> Add
          </button>
        </div>
        <div className={styles.bulletPointsContainer}>
          {data.bulletPoints.map((bullet, index) => {
            const isEditingThisBullet = editingBulletIndex === index

            return (
              <BulletPoint
                key={bullet.id}
                sectionId={data.id}
                index={index}
                text={bullet.text}
                keywordData={keywordData}
                editingText={isEditingThisBullet ? editingBulletText : ''}
                isRegenerating={
                  isRegenerating &&
                  regeneratingBullet?.section === data.id &&
                  regeneratingBullet?.index === index
                }
                isEditing={isEditingThisBullet}
                disableAllControls={
                  isRegenerating ||
                  (editingBulletIndex !== null && !isEditingThisBullet)
                }
                errors={editingBulletIndex === index ? bulletErrors : {}}
                settings={settings}
                isLocked={bullet.isLocked || false}
                isDangerousAction={true}
                onCancelEdit={onBulletCancel}
                onBulletDelete={(index) => onBulletDelete(data.id, index)}
                onBulletSave={onBulletSave}
                onBulletEdit={(index) => onEditBullet(data.id, index)}
                onBulletRegenerate={handleRegenerateBullet}
                onTextareaChange={onTextareaChange}
                onLockToggle={(sectionId, index) => {
                  onLockToggle(sectionId, index)
                }}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default EditableProjectBlock
