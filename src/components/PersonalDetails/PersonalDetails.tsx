import styles from './PersonalDetails.module.scss'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { z } from 'zod'
import { useDebounce } from '@/lib/utils'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'

export interface PersonalDetailsFormValues {
  name: string
  email: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
}

type ValidationErrors = {
  [key in keyof PersonalDetailsFormValues]?: string
}

interface PersonalDetailsProps {
  data: PersonalDetailsFormValues
  loading: boolean
  onSave: (data: PersonalDetailsFormValues) => void
}

const formSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+\d+|\d+)$/.test(val),
      'Phone number can only contain numbers, and an optional + at the beginning'
    )
    .refine(
      (val) => !val || (val.length >= 10 && val.length <= 15),
      'Phone number must be 10 to 15 characters'
    ),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or less')
    .optional(),
  linkedin: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/(www\.)?linkedin\.com\/.*$/.test(val),
      'Please enter a valid LinkedIn URL'
    ),
  github: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/(www\.)?github\.com\/.*$/.test(val),
      'Please enter a valid GitHub URL'
    ),
  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/(www\.)?.*$/.test(val),
      'Please enter a valid website URL'
    ),
})

const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  data,
  loading,
  onSave,
}) => {
  const [formValues, setFormValues] = useState<PersonalDetailsFormValues>(data)
  const [touched, setTouched] = useState<
    Partial<Record<keyof PersonalDetailsFormValues, boolean>>
  >({})

  useEffect(() => {
    setFormValues(data)
    setTouched({})
  }, [data])

  const isValid = useMemo(
    () => formSchema.safeParse(formValues).success,
    [formValues]
  )

  const debouncedFormValues = useDebounce(formValues, 300)

  const errors = useMemo(() => {
    const result = formSchema.safeParse(debouncedFormValues)
    if (result.success) {
      return {} as ValidationErrors
    }
    const errors: ValidationErrors = {}
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof PersonalDetailsFormValues
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
