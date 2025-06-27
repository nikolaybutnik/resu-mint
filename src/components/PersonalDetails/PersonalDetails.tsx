import styles from './PersonalDetails.module.scss'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebounce } from '@/lib/clientUtils'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { personalDetailsSchema } from '@/lib/validationSchemas'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'

type ValidationErrors = {
  [key in keyof PersonalDetailsType]?: string
}

interface PersonalDetailsProps {
  data: PersonalDetailsType
  loading: boolean
  onSave: (data: PersonalDetailsType) => void
}

const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  data,
  loading,
  onSave,
}) => {
  const [formValues, setFormValues] = useState<PersonalDetailsType>(data)
  const [touched, setTouched] = useState<
    Partial<Record<keyof PersonalDetailsType, boolean>>
  >({})

  useEffect(() => {
    setFormValues(data)
    setTouched({})
  }, [data])

  const isValid = useMemo(
    () => personalDetailsSchema.safeParse(formValues).success,
    [formValues]
  )

  const debouncedFormValues = useDebounce(formValues, 300)

  const errors = useMemo(() => {
    const result = personalDetailsSchema.safeParse(debouncedFormValues)
    if (result.success) {
      return {} as ValidationErrors
    }
    const errors: ValidationErrors = {}
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof PersonalDetailsType
      errors[field] = issue.message
    })
    return errors
  }, [debouncedFormValues])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const { name, value } = e.target
      setFormValues((prev) => ({ ...prev, [name]: value }))
      setTouched((prev) => ({ ...prev, [name]: true }))
    },
    []
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (isValid) {
        onSave(formValues)
      }
    },
    [formValues, isValid, onSave]
  )

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Saving your details...' size='lg' />
      ) : (
        <form className={styles.formSection} onSubmit={handleSubmit}>
          <h2 className={styles.formTitle}>Personal Details</h2>

          <div className={styles.requiredFieldsNote}>
            <span className={styles.requiredIndicator}>*</span>
            Indicates a required field
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              <span className={styles.requiredIndicator}>*</span>
              Full Name
            </label>
            <input
              name='name'
              placeholder='Enter your full name'
              className={styles.formInput}
              value={formValues.name}
              onChange={handleChange}
            />
            {touched.name && errors.name && (
              <p className={styles.formError}>{errors.name}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              <span className={styles.requiredIndicator}>*</span>
              Email
            </label>
            <input
              name='email'
              type='email'
              placeholder='Enter your email address'
              className={styles.formInput}
              value={formValues.email}
              onChange={handleChange}
            />
            {touched.email && errors.email && (
              <p className={styles.formError}>{errors.email}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Phone</label>
            <input
              name='phone'
              placeholder='e.g., +1234567890'
              className={styles.formInput}
              value={formValues.phone || ''}
              onChange={handleChange}
            />
            {touched.phone && errors.phone && (
              <p className={styles.formError}>{errors.phone}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Location</label>
            <input
              name='location'
              placeholder='e.g., New York, NY'
              className={styles.formInput}
              value={formValues.location || ''}
              onChange={handleChange}
            />
            {touched.location && errors.location && (
              <p className={styles.formError}>{errors.location}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>LinkedIn URL</label>
            <input
              name='linkedin'
              placeholder='https://linkedin.com/in/your-profile'
              className={styles.formInput}
              value={formValues.linkedin || ''}
              onChange={handleChange}
            />
            {touched.linkedin && errors.linkedin && (
              <p className={styles.formError}>{errors.linkedin}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>GitHub URL</label>
            <input
              name='github'
              placeholder='https://github.com/your-username'
              className={styles.formInput}
              value={formValues.github || ''}
              onChange={handleChange}
            />
            {touched.github && errors.github && (
              <p className={styles.formError}>{errors.github}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Website URL</label>
            <input
              name='website'
              placeholder='https://your-website.com'
              className={styles.formInput}
              value={formValues.website || ''}
              onChange={handleChange}
            />
            {touched.website && errors.website && (
              <p className={styles.formError}>{errors.website}</p>
            )}
          </div>

          <div className={styles.actionButtons}>
            <button
              type='submit'
              className={styles.formButton}
              disabled={!isValid}
            >
              Save
            </button>
          </div>
        </form>
      )}
    </>
  )
}

export default PersonalDetails
