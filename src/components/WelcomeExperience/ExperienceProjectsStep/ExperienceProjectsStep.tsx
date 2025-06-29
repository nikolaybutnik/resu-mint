import styles from './ExperienceProjectsStep.module.scss'
import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'
import {
  experienceBlockSchema,
  projectBlockSchema,
} from '@/lib/validationSchemas'
import {
  ExperienceBlockData,
  StartDate,
  EndDate,
  Month,
} from '@/lib/types/experience'
import { ProjectBlockData } from '@/lib/types/projects'

interface ExperienceProjectsStepProps {
  onContinue: () => void
}

// Union type for form data that can handle both experience and project fields
type FormDataType = {
  id?: string
  title?: string
  companyName?: string
  location?: string
  startDate?: StartDate
  endDate?: EndDate
  description?: string
  technologies?: string[]
  link?: string
  bulletPoints?: { id: string; text: string; isLocked: boolean }[]
  isIncluded?: boolean
}

// Type for data items stored in localStorage
type StoredDataItem = ExperienceBlockData | ProjectBlockData

// Type for form field values (more flexible for form inputs)
type FormFieldValue =
  | string
  | boolean
  | StartDate
  | EndDate
  | string[]
  | Partial<StartDate>
  | Partial<EndDate>

export const ExperienceProjectsStep: React.FC<ExperienceProjectsStepProps> = ({
  onContinue,
}) => {
  const [selectedOption, setSelectedOption] = useState<
    'experience' | 'project' | null
  >(null)
  const [formData, setFormData] = useState<FormDataType>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasExistingData, setHasExistingData] = useState(false)

  // Check for existing data when component mounts
  useEffect(() => {
    const experienceData = localStorage.getItem(STORAGE_KEYS.EXPERIENCE)
    const projectData = localStorage.getItem(STORAGE_KEYS.PROJECTS)

    const hasExperience = experienceData
      ? (JSON.parse(experienceData) as StoredDataItem[]).length > 0
      : false
    const hasProject = projectData
      ? (JSON.parse(projectData) as StoredDataItem[]).length > 0
      : false

    // Reset form state
    setSelectedOption(null)
    setFormData({})
    setErrors({})
    setHasExistingData(hasExperience || hasProject)
  }, [])

  // Form field handlers
  const handleFieldChange = (field: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  // Handle discarding existing data and starting fresh
  const handleDiscardAndReplace = () => {
    setSelectedOption(null)
    setFormData({})
    setErrors({})
    setHasExistingData(false)
  }

  // Handle selecting an option (either new or edit existing)
  const handleOptionSelect = (option: 'experience' | 'project') => {
    setSelectedOption(option)
    setErrors({})

    // Load existing data if it exists
    const storageKey =
      option === 'experience' ? STORAGE_KEYS.EXPERIENCE : STORAGE_KEYS.PROJECTS
    const existingData = localStorage.getItem(storageKey)

    if (existingData) {
      const parsedData = JSON.parse(existingData) as StoredDataItem[]
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Load the most recent entry for editing
        setFormData(parsedData[parsedData.length - 1] as FormDataType)
        return
      }
    }

    // No existing data, start fresh
    setFormData({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOption) return

    // Prepare form data with required fields
    const baseData = {
      id: formData.id || uuidv4(), // Keep existing ID if updating
      ...formData,
      isIncluded: true,
      bulletPoints: formData.bulletPoints || [],
    }

    let validationResult
    let storageKey
    let dataToSave

    if (selectedOption === 'experience') {
      const experienceData = {
        ...baseData,
        title: formData.title || '',
        companyName: formData.companyName || '',
        location: formData.location || '',
        startDate: formData.startDate || { month: '', year: '' },
        endDate: formData.endDate || {
          isPresent: false,
          month: '',
          year: '',
        },
        description: formData.description || '',
      } as ExperienceBlockData

      validationResult = experienceBlockSchema.safeParse(experienceData)
      storageKey = STORAGE_KEYS.EXPERIENCE
      dataToSave = experienceData
    } else {
      const projectData = {
        ...baseData,
        title: formData.title || '',
        startDate: formData.startDate || { month: '', year: '' },
        endDate: formData.endDate || {
          isPresent: false,
          month: '',
          year: '',
        },
        technologies: formData.technologies || [],
        link: formData.link || '',
        description: formData.description || '',
      } as ProjectBlockData

      validationResult = projectBlockSchema.safeParse(projectData)
      storageKey = STORAGE_KEYS.PROJECTS
      dataToSave = projectData
    }

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {}
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path.join('.')
        newErrors[path] = issue.message
      })
      setErrors(newErrors)
      return
    }

    // Save to localStorage
    const existingData = localStorage.getItem(storageKey)
    const dataArray: StoredDataItem[] = existingData
      ? JSON.parse(existingData)
      : []

    const isEditing =
      formData.id && dataArray.some((item) => item.id === formData.id)

    if (isEditing) {
      // Update existing entry
      const index = dataArray.findIndex((item) => item.id === formData.id)
      if (index !== -1) {
        dataArray[index] = dataToSave
      }
    } else {
      // Add new entry
      dataArray.push(dataToSave)
    }

    localStorage.setItem(storageKey, JSON.stringify(dataArray))

    // Continue to next step
    onContinue()
  }

  const renderSelectionPhase = () => {
    const experienceData = localStorage.getItem(STORAGE_KEYS.EXPERIENCE)
    const projectData = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    const hasExperience = experienceData
      ? (JSON.parse(experienceData) as StoredDataItem[]).length > 0
      : false
    const hasProject = projectData
      ? (JSON.parse(projectData) as StoredDataItem[]).length > 0
      : false

    if (hasExperience && hasProject) {
      return (
        <>
          <p>Great! You&apos;ve added both experience and project.</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('experience')}
            >
              Edit Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('project')}
            >
              Edit Personal Project
            </button>
          </div>
          <button
            type='button'
            className={styles.submitButton}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      )
    } else if (hasExperience) {
      return (
        <>
          <p>You&apos;ve added work experience. You can also add a project:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('experience')}
            >
              Edit Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('project')}
            >
              Add Personal Project
            </button>
          </div>
          <button
            type='button'
            className={styles.submitButton}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      )
    } else if (hasProject) {
      return (
        <>
          <p>You&apos;ve added a project. You can also add work experience:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('experience')}
            >
              Add Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('project')}
            >
              Edit Personal Project
            </button>
          </div>
          <button
            type='button'
            className={styles.submitButton}
            onClick={onContinue}
          >
            Continue
          </button>
        </>
      )
    } else {
      return (
        <>
          <p>Choose what you&apos;d like to add:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('experience')}
            >
              Add Work Experience
            </button>
            <button
              className={styles.choiceButton}
              onClick={() => handleOptionSelect('project')}
            >
              Add Personal Project
            </button>
          </div>
        </>
      )
    }
  }

  return (
    <div className={styles.stepContent}>
      <div className={styles.welcomeForm}>
        {!selectedOption ? (
          // Selection phase
          <div className={styles.placeholderContent}>
            {renderSelectionPhase()}
          </div>
        ) : (
          // Form phase
          <form onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <button
                type='button'
                className={styles.backToChoiceButton}
                onClick={handleDiscardAndReplace}
              >
                {hasExistingData
                  ? '← Replace with different option'
                  : '← Back to selection'}
              </button>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>
                {selectedOption === 'experience'
                  ? 'Job Title'
                  : 'Project Title'}
              </label>
              <input
                type='text'
                className={`${styles.formInput} ${
                  errors.title ? styles.error : ''
                }`}
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder={
                  selectedOption === 'experience'
                    ? 'e.g., Software Engineer'
                    : 'e.g., Personal Website'
                }
              />
              {errors.title && (
                <span className={styles.formError}>{errors.title}</span>
              )}
            </div>

            {selectedOption === 'experience' && (
              <>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Company</label>
                  <input
                    type='text'
                    className={`${styles.formInput} ${
                      errors.companyName ? styles.error : ''
                    }`}
                    value={formData.companyName || ''}
                    onChange={(e) =>
                      handleFieldChange('companyName', e.target.value)
                    }
                    placeholder='e.g., Google'
                  />
                  {errors.companyName && (
                    <span className={styles.formError}>
                      {errors.companyName}
                    </span>
                  )}
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Location</label>
                  <input
                    type='text'
                    className={`${styles.formInput} ${
                      errors.location ? styles.error : ''
                    }`}
                    value={formData.location || ''}
                    onChange={(e) =>
                      handleFieldChange('location', e.target.value)
                    }
                    placeholder='e.g., San Francisco, CA'
                  />
                  {errors.location && (
                    <span className={styles.formError}>{errors.location}</span>
                  )}
                </div>
              </>
            )}

            <div className={styles.dateRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Start Date</label>
                <div className={styles.dateInputs}>
                  <select
                    className={`${styles.formInput} ${
                      errors['startDate.month'] ? styles.error : ''
                    }`}
                    value={formData.startDate?.month || ''}
                    onChange={(e) =>
                      handleFieldChange('startDate', {
                        ...formData.startDate,
                        month: e.target.value as Month | '',
                      })
                    }
                  >
                    <option value=''>Month</option>
                    <option value='Jan'>January</option>
                    <option value='Feb'>February</option>
                    <option value='Mar'>March</option>
                    <option value='Apr'>April</option>
                    <option value='May'>May</option>
                    <option value='Jun'>June</option>
                    <option value='Jul'>July</option>
                    <option value='Aug'>August</option>
                    <option value='Sep'>September</option>
                    <option value='Oct'>October</option>
                    <option value='Nov'>November</option>
                    <option value='Dec'>December</option>
                  </select>
                  <input
                    type='text'
                    className={`${styles.formInput} ${
                      errors['startDate.year'] ? styles.error : ''
                    }`}
                    value={formData.startDate?.year || ''}
                    onChange={(e) =>
                      handleFieldChange('startDate', {
                        ...formData.startDate,
                        year: e.target.value,
                      })
                    }
                    placeholder='Year'
                    maxLength={4}
                  />
                </div>
                {(errors['startDate.month'] || errors['startDate.year']) && (
                  <span className={styles.formError}>
                    {errors['startDate.month'] || errors['startDate.year']}
                  </span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>End Date</label>
                <div className={styles.dateInputs}>
                  <select
                    className={`${styles.formInput} ${
                      errors['endDate.month'] ? styles.error : ''
                    }`}
                    value={formData.endDate?.month || ''}
                    onChange={(e) =>
                      handleFieldChange('endDate', {
                        ...formData.endDate,
                        month: e.target.value as Month | '',
                        isPresent: false,
                      })
                    }
                    disabled={formData.endDate?.isPresent}
                  >
                    <option value=''>Month</option>
                    <option value='Jan'>January</option>
                    <option value='Feb'>February</option>
                    <option value='Mar'>March</option>
                    <option value='Apr'>April</option>
                    <option value='May'>May</option>
                    <option value='Jun'>June</option>
                    <option value='Jul'>July</option>
                    <option value='Aug'>August</option>
                    <option value='Sep'>September</option>
                    <option value='Oct'>October</option>
                    <option value='Nov'>November</option>
                    <option value='Dec'>December</option>
                  </select>
                  <input
                    type='text'
                    className={`${styles.formInput} ${
                      errors['endDate.year'] ? styles.error : ''
                    }`}
                    value={formData.endDate?.year || ''}
                    onChange={(e) =>
                      handleFieldChange('endDate', {
                        ...formData.endDate,
                        year: e.target.value,
                        isPresent: false,
                      })
                    }
                    placeholder='Year'
                    maxLength={4}
                    disabled={formData.endDate?.isPresent}
                  />
                </div>
                <div className={styles.presentCheckbox}>
                  <input
                    type='checkbox'
                    id='isPresent'
                    checked={formData.endDate?.isPresent || false}
                    onChange={(e) =>
                      handleFieldChange('endDate', {
                        month: e.target.checked
                          ? ''
                          : (formData.endDate?.month as Month | '') || '',
                        year: e.target.checked
                          ? ''
                          : formData.endDate?.year || '',
                        isPresent: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor='isPresent' className={styles.checkboxLabel}>
                    {selectedOption === 'experience'
                      ? 'Currently working here'
                      : 'Currently working on this'}
                  </label>
                </div>
                {(errors['endDate.month'] || errors['endDate.year']) && (
                  <span className={styles.formError}>
                    {errors['endDate.month'] || errors['endDate.year']}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Description (Optional)</label>
              <textarea
                className={`${styles.formTextarea} ${
                  errors.description ? styles.error : ''
                }`}
                value={formData.description || ''}
                onChange={(e) =>
                  handleFieldChange('description', e.target.value)
                }
                placeholder={
                  selectedOption === 'experience'
                    ? 'Describe your role and responsibilities, what you did, what technologies you used, etc. This is optional but if entered, the AI will be able to more effectively optimize and tailor the resume content.'
                    : 'Describe your project, what you did, what technologies you used, etc. This is optional but if entered, the AI will be able to more effectively optimize and tailor the resume content.'
                }
                rows={3}
              />
              {errors.description && (
                <span className={styles.formError}>{errors.description}</span>
              )}
            </div>

            <button type='submit' className={styles.submitButton}>
              {hasExistingData ? 'Update & Continue' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
