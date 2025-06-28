import styles from './EducationStep.module.scss'
import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import { v4 as uuidv4 } from 'uuid'
import { educationBlockSchema } from '@/lib/validationSchemas'
import {
  EducationBlockData,
  DegreeStatus,
  StartDate,
  EndDate,
  Month,
} from '@/lib/types/education'

interface EducationStepProps {
  onContinue: () => void
  onSkip: () => void
}

// Form data type for education
type EducationFormData = Partial<EducationBlockData>

// Type for form field values
type FormFieldValue =
  | string
  | boolean
  | StartDate
  | EndDate
  | DegreeStatus
  | undefined
  | Partial<StartDate>
  | Partial<EndDate>

export const EducationStep: React.FC<EducationStepProps> = ({
  onContinue,
  onSkip,
}) => {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<EducationFormData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasExistingData, setHasExistingData] = useState(false)

  // Check for existing data when component mounts
  useEffect(() => {
    const educationData = localStorage.getItem(STORAGE_KEYS.EDUCATION)
    const hasEducation = educationData
      ? JSON.parse(educationData).length > 0
      : false

    setHasExistingData(hasEducation)
    setShowForm(false)
    setFormData({})
    setErrors({})
  }, [])

  // Form field handlers
  const handleFieldChange = (field: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddEducation = () => {
    setShowForm(true)
    setFormData({})
    setErrors({})
  }

  const handleEditEducation = () => {
    setShowForm(true)
    setErrors({})

    // Load existing data
    const existingData = localStorage.getItem(STORAGE_KEYS.EDUCATION)
    if (existingData) {
      const parsedData = JSON.parse(existingData) as EducationBlockData[]
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Load the most recent entry for editing
        setFormData(parsedData[parsedData.length - 1])
        return
      }
    }

    // No existing data, start fresh
    setFormData({})
  }

  const handleBackToChoice = () => {
    setShowForm(false)
    setFormData({})
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Prepare form data with required fields
    const educationData: EducationBlockData = {
      id: formData.id || uuidv4(),
      institution: formData.institution || '',
      degree: formData.degree || '',
      degreeStatus: formData.degreeStatus || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      location: formData.location || '',
      description: formData.description || '',
      isIncluded: true,
    }

    const validationResult = educationBlockSchema.safeParse(educationData)

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
    const existingData = localStorage.getItem(STORAGE_KEYS.EDUCATION)
    const dataArray: EducationBlockData[] = existingData
      ? JSON.parse(existingData)
      : []

    const isEditing =
      formData.id && dataArray.some((item) => item.id === formData.id)

    if (isEditing) {
      // Update existing entry
      const index = dataArray.findIndex((item) => item.id === formData.id)
      if (index !== -1) {
        dataArray[index] = validationResult.data as EducationBlockData
      }
    } else {
      // Add new entry
      dataArray.push(validationResult.data as EducationBlockData)
    }

    localStorage.setItem(STORAGE_KEYS.EDUCATION, JSON.stringify(dataArray))

    // Continue to next step
    onContinue()
  }

  const renderSelectionPhase = () => {
    if (hasExistingData) {
      return (
        <>
          <p>You&apos;ve added education details. You can edit or continue:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={handleEditEducation}
            >
              Edit Education
            </button>
            <button
              className={styles.choiceButton}
              onClick={handleAddEducation}
            >
              Add Another Education
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
          <p>Add your educational background:</p>
          <div className={styles.choiceButtons}>
            <button
              className={styles.choiceButton}
              onClick={handleAddEducation}
            >
              Add Education
            </button>
          </div>
          <div className={styles.skipSection}>
            <button
              type='button'
              className={styles.skipButton}
              onClick={onSkip}
            >
              Skip for now
            </button>
          </div>
        </>
      )
    }
  }

  return (
    <div className={styles.stepContent}>
      <div className={styles.welcomeForm}>
        {!showForm ? (
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
                onClick={handleBackToChoice}
              >
                ← Back to selection
              </button>
            </div>

            <div className={styles.formField}>
              <input
                type='text'
                className={`${styles.formInput} ${
                  errors.institution ? styles.error : ''
                }`}
                value={formData.institution || ''}
                onChange={(e) =>
                  handleFieldChange('institution', e.target.value)
                }
                placeholder='e.g., University of Toronto'
              />
              {errors.institution && (
                <span className={styles.formError}>{errors.institution}</span>
              )}
            </div>

            <div className={styles.formField}>
              <input
                type='text'
                className={`${styles.formInput} ${
                  errors.degree ? styles.error : ''
                }`}
                value={formData.degree || ''}
                onChange={(e) => handleFieldChange('degree', e.target.value)}
                placeholder='e.g., Bachelor of Science in Computer Science'
              />
              {errors.degree && (
                <span className={styles.formError}>{errors.degree}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Status</label>
              <select
                className={styles.formInput}
                value={formData.degreeStatus || ''}
                onChange={(e) =>
                  handleFieldChange(
                    'degreeStatus',
                    e.target.value === ''
                      ? undefined
                      : (e.target.value as DegreeStatus)
                  )
                }
              >
                <option value=''>Select status</option>
                <option value={DegreeStatus.COMPLETED}>Completed</option>
                <option value={DegreeStatus.IN_PROGRESS}>In Progress</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Location</label>
              <input
                type='text'
                className={`${styles.formInput} ${
                  errors.location ? styles.error : ''
                }`}
                value={formData.location || ''}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                placeholder='e.g., Toronto, ON'
              />
              {errors.location && (
                <span className={styles.formError}>{errors.location}</span>
              )}
            </div>

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
                      errors['endDate.year'] ? styles.error : ''
                    }`}
                    value={formData.endDate?.year || ''}
                    onChange={(e) =>
                      handleFieldChange('endDate', {
                        ...formData.endDate,
                        year: e.target.value,
                      })
                    }
                    placeholder='Year'
                    maxLength={4}
                  />
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
                placeholder='Add any relevant details about your education, achievements, coursework, etc.'
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
