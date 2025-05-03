'use client'
import styles from './ResumeForm.module.scss'
import { useActionState, useState, useEffect } from 'react'
import { z } from 'zod'
import {
  formatErrorsForClient,
  ApiResponse,
  ResponseStatus,
} from '@/lib/types/errors'

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
type ClientErrors = { [key: string]: string }

export type ResumeFormState = {
  data?: FormFields
  generatedSections?: { [key: string]: string[] }[]
  errors?: ClientErrors | null
}

type ResumeResponseData = {
  generatedSections: { [key: string]: string[] }[]
}

type LatexResponseData = {
  latex: string
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

      return {
        data,
        generatedSections: apiResult.generatedSections,
        errors: apiResult.errors || null,
      }
    },
    null
  )

  useEffect(() => {
    console.log(state)
  }, [state])

  const handleDataSubmit = async (
    data: FormFields
  ): Promise<ResumeFormState> => {
    const validatedData = formSchema.safeParse(data)

    if (!validatedData.success) {
      const errors: ClientErrors = {}
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

        const apiResult =
          (await response.json()) as ApiResponse<ResumeResponseData>

        if (!response.ok || apiResult.status === ResponseStatus.ERROR) {
          return {
            errors:
              apiResult.status === ResponseStatus.ERROR
                ? formatErrorsForClient(apiResult.errors)
                : { server: 'Failed to generate bullet points' },
          }
        }

        return {
          generatedSections: apiResult.data.generatedSections,
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

  const handleLatexGeneration = async () => {
    try {
      const payload = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '1234567890',
        generatedSections: state?.generatedSections,
      }

      const response = await fetch('/api/generate-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const apiResult =
        (await response.json()) as ApiResponse<LatexResponseData>

      if (apiResult.status === ResponseStatus.ERROR) {
        console.error(apiResult.errors)
        return
      }

      console.log(apiResult.data.latex)
    } catch (error) {
      console.error('API error:', error)
    }
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
        Generate Bullets
      </button>

      <button
        type='button'
        className={styles.formButton}
        disabled={!state?.generatedSections?.length || isPending}
        onClick={handleLatexGeneration}
      >
        Generate LaTeX
      </button>
    </form>
  )
}
