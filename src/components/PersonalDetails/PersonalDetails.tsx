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
          <div className={styles.formField}>
            <input
              name='name'
              placeholder='Full Name *'
              className={styles.formInput}
              value={formValues.name}
              onChange={handleChange}
            />
            {touched.name && errors.name && (
              <p className={styles.formError}>{errors.name}</p>
            )}
          </div>
          <div className={styles.formField}>
            <input
              name='email'
              placeholder='Email *'
              className={styles.formInput}
              value={formValues.email}
              onChange={handleChange}
            />
            {touched.email && errors.email && (
              <p className={styles.formError}>{errors.email}</p>
            )}
          </div>
          <div className={styles.formField}>
            <input
              name='phone'
              placeholder='Phone (e.g., +1234567890)'
              className={styles.formInput}
              value={formValues.phone || ''}
              onChange={handleChange}
            />
            {touched.phone && errors.phone && (
              <p className={styles.formError}>{errors.phone}</p>
            )}
          </div>
          <div className={styles.formField}>
            <input
              name='location'
              placeholder='Location (e.g., New York, NY)'
              className={styles.formInput}
              value={formValues.location || ''}
              onChange={handleChange}
            />
            {touched.location && errors.location && (
              <p className={styles.formError}>{errors.location}</p>
            )}
          </div>
          <div className={styles.formField}>
            <input
              name='linkedin'
              placeholder='LinkedIn URL'
              className={styles.formInput}
              value={formValues.linkedin || ''}
              onChange={handleChange}
            />
            {touched.linkedin && errors.linkedin && (
              <p className={styles.formError}>{errors.linkedin}</p>
            )}
          </div>
          <div className={styles.formField}>
            <input
              name='github'
              placeholder='GitHub URL'
              className={styles.formInput}
              value={formValues.github || ''}
              onChange={handleChange}
            />
            {touched.github && errors.github && (
              <p className={styles.formError}>{errors.github}</p>
            )}
          </div>
          <div className={styles.formField}>
            <input
              name='website'
              placeholder='Website URL'
              className={styles.formInput}
              value={formValues.website || ''}
              onChange={handleChange}
            />
            {touched.website && errors.website && (
              <p className={styles.formError}>{errors.website}</p>
            )}
          </div>
          <button
            type='submit'
            className={styles.formButton}
            disabled={!isValid}
          >
            Save
          </button>
        </form>
      )}
    </>
  )
}

export default PersonalDetails
