import styles from './PersonalDetailsStep.module.scss'
import { useState, useEffect } from 'react'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { personalDetailsSchema } from '@/lib/validationSchemas'
import { ZodError } from 'zod'

interface PersonalDetailsStepProps {
  onSubmit: (data: PersonalDetailsType) => void
  initialData?: PersonalDetailsType
}

export const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setEmail(initialData.email || '')
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    setErrors({})

    const personalDetailsData: PersonalDetailsType = {
      name: name.trim(),
      email: email.trim(),
      phone: initialData?.phone || '',
      location: initialData?.location || '',
      linkedin: initialData?.linkedin || '',
      github: initialData?.github || '',
      website: initialData?.website || '',
    }

    try {
      const validatedData = personalDetailsSchema.parse(personalDetailsData)

      onSubmit(validatedData)
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
    }
  }

  return (
    <div className={styles.stepContent}>
      <form onSubmit={handleSubmit} className={styles.welcomeForm}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Full Name</label>
          <input
            type='text'
            className={`${styles.formInput} ${errors.name ? styles.error : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Enter your full name'
          />
          {errors.name && (
            <span className={styles.formError}>{errors.name}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Email Address</label>
          <input
            type='email'
            className={`${styles.formInput} ${
              errors.email ? styles.error : ''
            }`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Enter your email address'
          />
          {errors.email && (
            <span className={styles.formError}>{errors.email}</span>
          )}
        </div>

        <button type='submit' className={styles.submitButton}>
          Continue
        </button>
      </form>
    </div>
  )
}
