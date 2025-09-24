import styles from './EditableProjectBlock.module.scss'
import { useActionState, useEffect, useMemo, useState, useRef } from 'react'
import React from 'react'
import { FaPlus, FaXmark } from 'react-icons/fa6'
import { FORM_IDS, MONTHS, PROJECT_FORM_DATA_KEYS } from '@/lib/constants'
import { ProjectBlockData, ProjectFormState } from '@/lib/types/projects'
import { KeywordData } from '@/lib/types/keywords'
import { useAutoResizeTextarea } from '@/lib/hooks'
import { submitProject } from '@/lib/actions/projectActions'
import { useFormStatus } from 'react-dom'
import { useProjectStore, useAiStateStore, confirm } from '@/stores'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { BulletPoint as BulletPointType } from '@/lib/types/projects'
import { v4 as uuidv4 } from 'uuid'
import { extractProjectFormData } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

const normalizeTechnology = (tech: string): string =>
  tech.trim().toLowerCase().replace(/\s+/g, ' ')

interface EditableProjectBlockProps {
  data: ProjectBlockData
  keywordData: KeywordData | null
  onClose: (() => void) | undefined
}

const EditableProjectBlock: React.FC<EditableProjectBlockProps> = ({
  data,
  keywordData,
  onClose,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null)

  const {
    data: projectData,
    delete: deleteProject,
    upsert,
    hasBlockChanges,
  } = useProjectStore()
  const { bulletIdsGenerating } = useAiStateStore()

  const isNew = !projectData.some((block) => block.id === data.id)
  const shouldShowCloseButton = projectData.length > 1 || !isNew
  const isAnyBulletRegenerating = bulletIdsGenerating.length > 0

  const [state, formAction] = useActionState(
    async (
      prevState: ProjectFormState,
      formData: FormData
    ): Promise<ProjectFormState> => submitProject(prevState, formData, upsert),
    {
      fieldErrors: {},
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
  const [temporaryBullet, setTemporaryBullet] =
    useState<BulletPointType | null>(null)

  useEffect(() => {
    const notifications = state?.notifications
    if (!notifications || notifications.length === 0) return

    notifications.forEach((notification) => {
      toast[notification.type](notification.message)
    })
  }, [state?.notifications])

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

  const isTechDuplicate = useMemo(() => {
    if (!techInput.trim()) return false
    return technologies.some(
      (tech) => normalizeTechnology(tech) === normalizeTechnology(techInput)
    )
  }, [techInput, technologies, normalizeTechnology])

  const handleAddTechnology = () => {
    const trimmedTech = techInput.trim()
    if (!trimmedTech || isTechDuplicate) return

    setTechnologies((prev) => [...prev, trimmedTech])
    setTechInput('')
  }

  const duplicateTechnology = useMemo(() => {
    if (!techInput.trim()) return null
    const normalizedInput = normalizeTechnology(techInput)
    return (
      technologies.find(
        (tech) => normalizeTechnology(tech) === normalizedInput
      ) || null
    )
  }, [techInput, technologies])

  const handleDelete = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Delete this project?',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      anchorEl: deleteButtonRef.current,
      placement: 'left',
      width: 260,
    })

    if (!ok) return

    await deleteProject(data.id)
    onClose?.()
  }

  const handleBulletAdd = () => {
    const newBullet: BulletPointType = {
      id: uuidv4(),
      text: '',
      isLocked: false,
      isTemporary: true,
    }
    setTemporaryBullet(newBullet)
  }

  const handleBulletCancel = () => {
    setTemporaryBullet(null)
  }

  const handleFormClose = async (): Promise<void> => {
    const form = document.querySelector(
      `form[data-tab="${FORM_IDS.PROJECTS}"]`
    ) as HTMLFormElement | null
    let isDirty = false

    if (form) {
      const current = extractProjectFormData(form)
      isDirty = hasBlockChanges(current.id, current)
    }

    if (isDirty) {
      const ok = await confirm({
        title: 'You have unsaved changes',
        message:
          'If you leave without saving, you will lose your changes. Continue?',
        confirmText: 'Yes',
        cancelText: 'No',
        anchorEl: closeButtonRef.current,
        placement: 'right',
        width: 260,
      })

      if (!ok) return
    }

    onClose?.()
  }

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
            ref={deleteButtonRef}
            onClick={handleDelete}
            disabled={isAnyBulletRegenerating}
          >
            Delete
          </button>
        )}
        {shouldShowCloseButton && onClose && (
          <button
            type='button'
            className={styles.closeButton}
            ref={closeButtonRef}
            onClick={handleFormClose}
          >
            <FaXmark />
          </button>
        )}
      </div>

      <div className={styles.requiredFieldsNote}>
        <span className={styles.requiredIndicator}>*</span>
        Indicates a required field
      </div>

      <form
        action={formAction}
        className={styles.projectDetails}
        data-tab={FORM_IDS.PROJECTS}
      >
        {/* Hidden input synced with technologies state to send technologies array to form action */}
        <input
          type='hidden'
          name={PROJECT_FORM_DATA_KEYS.TECHNOLOGIES}
          value={technologies.join(',')}
        />
        <input type='hidden' name='id' value={data.id} />

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Project Name
          </label>
          <input
            type='text'
            name={PROJECT_FORM_DATA_KEYS.TITLE}
            className={`${styles.formInput} ${
              state?.fieldErrors?.title ? styles.error : ''
            }`}
            defaultValue={state.data?.title}
            placeholder='Enter the name of your project'
          />
          {state?.fieldErrors?.title && (
            <span className={styles.formError}>{state.fieldErrors.title}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Project URL</label>
          <input
            type='text'
            name={PROJECT_FORM_DATA_KEYS.LINK}
            className={`${styles.formInput} ${
              state?.fieldErrors?.link ? styles.error : ''
            }`}
            defaultValue={state.data?.link}
            placeholder='Enter the URL of your project'
          />
          {state?.fieldErrors?.link && (
            <span className={styles.formError}>{state.fieldErrors.link}</span>
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
          {state?.fieldErrors?.startDate && (
            <span className={styles.formError}>
              {state.fieldErrors.startDate}
            </span>
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
              name={PROJECT_FORM_DATA_KEYS.END_DATE_YEAR}
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
          {state?.fieldErrors?.endDate && (
            <span className={styles.formError}>
              {state.fieldErrors.endDate}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            <span className={styles.requiredIndicator}>*</span>
            Description
          </label>
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
          {state?.fieldErrors?.description && (
            <span className={styles.formError}>
              {state.fieldErrors.description}
            </span>
          )}
        </div>

        <div className={styles.actionButtons}>
          <SubmitButton />
        </div>
      </form>

      {!isNew && (
        <div className={styles.bulletPoints}>
          <div className={styles.bulletHeader}>
            <h3>Bullet Points</h3>
            <button
              type='button'
              className={styles.addButton}
              onClick={handleBulletAdd}
              disabled={isAnyBulletRegenerating}
            >
              <FaPlus /> Add
            </button>
          </div>
          <div className={styles.bulletPointsContainer}>
            {data.bulletPoints?.map((bullet) => (
              <BulletPoint
                key={bullet.id}
                sectionId={data.id}
                sectionType='project'
                keywordData={keywordData}
                bulletData={bullet}
                onBulletCancel={handleBulletCancel}
              />
            ))}
            {temporaryBullet && (
              <BulletPoint
                key={temporaryBullet.id}
                sectionId={data.id}
                sectionType='project'
                keywordData={keywordData}
                bulletData={temporaryBullet}
                onBulletCancel={handleBulletCancel}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default React.memo(EditableProjectBlock)
