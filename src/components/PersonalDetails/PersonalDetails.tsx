import styles from './PersonalDetails.module.scss'
import { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'
import { debounce } from 'lodash'

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
  onUpdate?: ({
    data,
    isValid,
  }: {
    data: PersonalDetailsFormValues
    isValid: boolean
  }) => void
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
  onUpdate,
}) => {
  const [formValues, setFormValues] = useState<PersonalDetailsFormValues>(data)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<
    Partial<Record<keyof PersonalDetailsFormValues, boolean>>
  >({})

  useEffect(() => {
    setFormValues(data)
  }, [data])

  const validateField = useCallback(
    (
      field: keyof PersonalDetailsFormValues,
      value: string | undefined
    ): string => {
      // Validates only the current field
      const pickObj = { [field]: true } as { [K in typeof field]: true }
      const partialSchema = formSchema.pick(pickObj)
      const result = partialSchema.safeParse({ [field]: value })
      if (!result.success) {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === field
        )
        return error?.message || ''
      }
      return ''
    },
    [formSchema]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const { name, value } = e.target
      setFormValues({ ...formValues, [name]: value })
      setTouched((prev) => ({ ...prev, [name]: true }))
    },
    [formValues]
  )

  const validateTouchedFields = debounce(
    (
      formValues: PersonalDetailsFormValues,
      touched: Partial<Record<keyof PersonalDetailsFormValues, boolean>>,
      setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>
    ): void => {
      Object.keys(formValues).forEach((key) => {
        if (touched[key as keyof PersonalDetailsFormValues]) {
          const error = validateField(
            key as keyof PersonalDetailsFormValues,
            formValues[key as keyof PersonalDetailsFormValues]
          )
          setErrors((prev) => ({
            ...prev,
            [key]: error || undefined,
          }))
        }
      })
    },
    300
  )

  useEffect(() => {
    validateTouchedFields(formValues, touched, setErrors)
    return () => validateTouchedFields.cancel()
  }, [formValues, touched])

  const validateAll = useCallback((): boolean => {
    const result = formSchema.safeParse(formValues)
    if (!result.success) {
      const newErrors: ValidationErrors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof PersonalDetailsFormValues
        newErrors[field] = issue.message
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }, [formValues, formSchema])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const valid = validateAll()
      onUpdate?.({ data: formValues, isValid: valid })
    },
    [formValues, validateAll, onUpdate]
  )

  return (
    <form className={styles.formSection} onSubmit={handleSubmit}>
      <h2>Personal Details</h2>
      <div className={styles.formField}>
        <input
          name='name'
          placeholder='Full Name *'
          className={styles.formInput}
          value={formValues.name}
          onChange={handleChange}
        />
        {errors.name && <p className={styles.formError}>{errors.name}</p>}
      </div>
      <div className={styles.formField}>
        <input
          name='email'
          placeholder='Email *'
          className={styles.formInput}
          value={formValues.email}
          onChange={handleChange}
        />
        {errors.email && <p className={styles.formError}>{errors.email}</p>}
      </div>
      <div className={styles.formField}>
        <input
          name='phone'
          placeholder='Phone (e.g., +1234567890)'
          className={styles.formInput}
          value={formValues.phone}
          onChange={handleChange}
        />
        {errors.phone && <p className={styles.formError}>{errors.phone}</p>}
      </div>
      <div className={styles.formField}>
        <input
          name='location'
          placeholder='Location (e.g., New York, NY)'
          className={styles.formInput}
          value={formValues.location}
          onChange={handleChange}
        />
        {errors.location && (
          <p className={styles.formError}>{errors.location}</p>
        )}
      </div>
      <div className={styles.formField}>
        <input
          name='linkedin'
          placeholder='LinkedIn URL'
          className={styles.formInput}
          value={formValues.linkedin}
          onChange={handleChange}
        />
        {errors.linkedin && (
          <p className={styles.formError}>{errors.linkedin}</p>
        )}
      </div>
      <div className={styles.formField}>
        <input
          name='github'
          placeholder='GitHub URL'
          className={styles.formInput}
          value={formValues.github}
          onChange={handleChange}
        />
        {errors.github && <p className={styles.formError}>{errors.github}</p>}
      </div>
      <div className={styles.formField}>
        <input
          name='website'
          placeholder='Website URL'
          className={styles.formInput}
          value={formValues.website}
          onChange={handleChange}
        />
        {errors.website && <p className={styles.formError}>{errors.website}</p>}
      </div>
      <button type='submit' className={styles.formButton}>
        Save
      </button>
    </form>
  )
}

export default PersonalDetails
