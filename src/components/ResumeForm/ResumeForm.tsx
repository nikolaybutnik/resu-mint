'use client'
import styles from './ResumeForm.module.scss'
import { useActionState, useState } from 'react'
import { z } from 'zod'
import { getResumeTemplate } from '@/lib/resume-template'

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

export type ResumeFormState = {
  data?: FormFields
  generatedSections?: { [key: string]: string[] }[]
  errors?: { [key: string]: string }
}

export const ResumeForm: React.FC = () => {
  const [formValues, setFormValues] = useState<FormFields>({
    experience: '',
    jobDescription: '',
    numBulletsPerExperience: 0,
    maxCharsPerBullet: 0,
  })

  const [state, formAction, isPending] = useActionState(
    async (_previousState: ResumeFormState | null, formData: FormData) => {
      const data: FormFields = {
        experience: formData.get('experience') as string,
        jobDescription: formData.get('jobDescription') as string,
        numBulletsPerExperience: Number(
          formData.get('numBulletsPerExperience') || 0
        ),
        maxCharsPerBullet: Number(formData.get('maxCharsPerBullet') || 0),
      }

      const apiResult = await handleDataSubmit(data)

      return apiResult
    },
    null
  )

  const handleDataSubmit = async (
    data: FormFields
  ): Promise<ResumeFormState> => {
    const validatedData = formSchema.safeParse(data)

    if (!validatedData.success) {
      const errors: { [key: string]: string } = {}
      validatedData.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        errors[field] = issue.message
      })
      return { errors }
    } else {
      try {
        const response = await fetch('/api/generate-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validatedData.data),
        })

        const apiResult: ResumeFormState = await response.json()

        if (!response.ok) {
          return {
            errors: apiResult.errors || {
              server: 'Failed to generate bullet points',
            },
          }
        }

        return {
          data: apiResult.data,
          generatedSections: apiResult.generatedSections,
        }
      } catch (error) {
        console.error('API error:', error)
        return { errors: { server: 'Network error occurred' } }
      }
    }
  }

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

  const handlePreview = () => {
    const resumeTemplate = state?.generatedSections?.length
      ? getResumeTemplate(
          'John Doe',
          'test@test.com',
          '1234567890',
          state?.generatedSections || []
        )
      : 'No Data'

    console.log(resumeTemplate)
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

      <button type='submit' className={styles.formButton} disabled={isPending}>
        Mint Resume
      </button>

      <button
        type='button'
        className={styles.formButton}
        disabled={!state?.generatedSections?.length || isPending}
        onClick={handlePreview}
      >
        Preview Resume
      </button>
    </form>
  )
}
