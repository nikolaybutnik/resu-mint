'use client'
import styles from './ResumeForm.module.scss'
import { useActionState, useState } from 'react'
import { z } from 'zod'

const formSchema = z.object({
  experience: z
    .string()
    .min(10, 'Experience must be at least 10 characters')
    .nonempty('Experience is required'),
  jobDescription: z
    .string()
    .min(10, 'Job description must be at least 10 characters')
    .nonempty('Job description is required'),
  numBulletsPerExperience: z
    .number()
    .min(1, 'Number of bullets must be at least 1')
    .max(10, 'Number of bullets cannot exceed 10'),
  maxCharsPerBullet: z
    .number()
    .min(50, 'Max characters must be at least 50')
    .max(200, 'Max characters cannot exceed 200'),
})

type FormFields = z.infer<typeof formSchema>

type ActionState = {
  data?: FormFields
  errors?: { [key: string]: string }
}

export const ResumeForm: React.FC = () => {
  const [formValues, setFormValues] = useState<FormFields>({
    experience: '',
    jobDescription: '',
    numBulletsPerExperience: 0,
    maxCharsPerBullet: 0,
  })

  const [state, formAction] = useActionState(
    async (_previousState: ActionState | null, formData: FormData) => {
      const data: FormFields = {
        experience: formData.get('experience') as string,
        jobDescription: formData.get('jobDescription') as string,
        numBulletsPerExperience: Number(
          formData.get('numBulletsPerExperience') || 0
        ),
        maxCharsPerBullet: Number(formData.get('maxCharsPerBullet') || 0),
      }

      const result = formSchema.safeParse(data)

      if (!result.success) {
        const errors: { [key: string]: string } = {}
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string
          errors[field] = issue.message
        })
        return { errors }
      }

      console.log(result.data)
      return { data: result.data }
    },
    null
  )

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]:
        name === 'numBulletsPerExperience' || name === 'maxCharsPerBullet'
          ? Number(value) || 0
          : value,
    }))
  }

  return (
    <form className={styles.form} action={formAction}>
      <textarea
        name='experience'
        placeholder='Work Experience'
        className={styles.formInput}
        value={formValues.experience}
        onChange={handleChange}
      />
      {state?.errors?.experience && (
        <p className={styles.errorMessage}>{state.errors.experience}</p>
      )}

      <textarea
        name='jobDescription'
        placeholder='Job Description'
        className={styles.formInput}
        value={formValues.jobDescription}
        onChange={handleChange}
      />
      {state?.errors?.jobDescription && (
        <p className={styles.errorMessage}>{state.errors.jobDescription}</p>
      )}

      <input
        name='numBulletsPerExperience'
        autoComplete='off'
        placeholder='Number of Bullets'
        className={styles.formInput}
        value={formValues.numBulletsPerExperience || ''}
        onChange={handleChange}
      />
      {state?.errors?.numBulletsPerExperience && (
        <p className={styles.errorMessage}>
          {state.errors.numBulletsPerExperience}
        </p>
      )}

      <input
        name='maxCharsPerBullet'
        autoComplete='off'
        placeholder='Max Characters'
        className={styles.formInput}
        value={formValues.maxCharsPerBullet || ''}
        onChange={handleChange}
      />
      {state?.errors?.maxCharsPerBullet && (
        <p className={styles.errorMessage}>{state.errors.maxCharsPerBullet}</p>
      )}

      <button type='submit' className={styles.formButton}>
        Mint Resume
      </button>
    </form>
  )
}
