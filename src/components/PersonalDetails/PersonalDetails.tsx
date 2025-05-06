import styles from './PersonalDetails.module.scss'
import { useState, useEffect } from 'react'
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
  initialValues?: PersonalDetailsFormValues
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

// TODO: pass initialValues from parent component
const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  initialValues = {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  },
  onUpdate,
}) => {
  const [formValues, setFormValues] =
    useState<PersonalDetailsFormValues>(initialValues)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<
    Partial<Record<keyof PersonalDetailsFormValues, boolean>>
  >({})
  const [isValid, setIsValid] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)

  // This will be utilized if the user is not logged in
  useEffect(() => {
    const savedData = localStorage.getItem('resumint_personalDetails')
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        const result = formSchema.safeParse(parsedData)
        const valid = result.success
        if (valid) {
          setFormValues(parsedData)
        }
        setIsValid(valid)
        onUpdate?.({ data: parsedData, isValid: valid })
      } catch (error) {
        console.error(
          'Failed to load personal details from localStorage:',
          error
        )
        setIsValid(false)
        onUpdate?.({ data: formValues, isValid: false })
      }
    } else {
      setIsValid(false)
      onUpdate?.({ data: formValues, isValid: false })
    }

    setIsInitialized(true)
  }, [])

  const validateField = (
    field: keyof PersonalDetailsFormValues,
    value: string | undefined
  ): string => {
    // Validates only the current field
    const pickObj = { [field]: true } as { [K in typeof field]: true }
    const partialSchema = formSchema.pick(pickObj)
    const result = partialSchema.safeParse({ [field]: value })
    if (!result.success) {
      const error = result.error.issues.find((issue) => issue.path[0] === field)
      return error?.message || ''
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    setFormValues({ ...formValues, [name]: value })
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

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

  const validateAll = (): boolean => {
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
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valid = validateAll()
    setIsValid(valid)
    onUpdate?.({ data: formValues, isValid: valid })
  }

  return (
    <form className={styles.section} onSubmit={handleSubmit}>
      <h2>Personal Details</h2>
      <div className={styles.field}>
        <input
          name='name'
          placeholder='Full Name'
          className={styles.formInput}
          value={formValues.name}
          onChange={handleChange}
        />
        {isInitialized && errors.name && (
          <p className={styles.errorMessage}>{errors.name}</p>
        )}
      </div>
      <div className={styles.field}>
        <input
          name='email'
          placeholder='Email'
          className={styles.formInput}
          value={formValues.email}
          onChange={handleChange}
        />
        {isInitialized && errors.email && (
          <p className={styles.errorMessage}>{errors.email}</p>
        )}
      </div>
      <div className={styles.field}>
        <input
          name='phone'
          placeholder='Phone (e.g., +1234567890)'
          className={styles.formInput}
          value={formValues.phone}
          onChange={handleChange}
        />
        {isInitialized && errors.phone && (
          <p className={styles.errorMessage}>{errors.phone}</p>
        )}
      </div>
      <div className={styles.field}>
        <input
          name='location'
          placeholder='Location (e.g., New York, NY)'
          className={styles.formInput}
          value={formValues.location}
          onChange={handleChange}
        />
        {isInitialized && errors.location && (
          <p className={styles.errorMessage}>{errors.location}</p>
        )}
      </div>
      <div className={styles.field}>
        <input
          name='linkedin'
          placeholder='LinkedIn URL (optional)'
          className={styles.formInput}
          value={formValues.linkedin}
          onChange={handleChange}
        />
        {isInitialized && errors.linkedin && (
          <p className={styles.errorMessage}>{errors.linkedin}</p>
        )}
      </div>
      <div className={styles.field}>
        <input
          name='github'
          placeholder='GitHub URL (optional)'
          className={styles.formInput}
          value={formValues.github}
          onChange={handleChange}
        />
        {isInitialized && errors.github && (
          <p className={styles.errorMessage}>{errors.github}</p>
        )}
      </div>
      <div className={styles.field}>
        <input
          name='website'
          placeholder='Website URL (optional)'
          className={styles.formInput}
          value={formValues.website}
          onChange={handleChange}
        />
        {isInitialized && errors.website && (
          <p className={styles.errorMessage}>{errors.website}</p>
        )}
      </div>
      <button type='submit' className={styles.formButton}>
        Save
      </button>
    </form>
  )
}

export default PersonalDetails
