'use client'
import styles from './ResumeForm.module.scss'
import { useActionState, useState, useEffect } from 'react'
import { z } from 'zod'
import {
  formatErrorsForClient,
  ApiResponse,
  ResponseStatus,
} from '@/lib/types/errors'
import { v4 as uuidv4 } from 'uuid'
import { saveAs } from 'file-saver'
import ExperienceBlock from '@/components/ExperienceBlock/ExperienceBlock'
import {
  ExperienceBlockData,
  Month,
} from '@/components/ExperienceBlock/ExperienceBlock'

const dummyExperienceData = [
  {
    id: '1',
    jobTitle: 'Software Engineer',
    companyName: 'Google',
    startDate: { month: 'Jan' as Month, year: '2020' },
    endDate: { month: 'Dec' as Month, year: '2022', isPresent: false },
    location: 'Mountain View, CA',
    bulletPoints: [
      'Developed and maintained web applications using React and Node.js',
      'Collaborated with cross-functional teams to implement new features',
      'Optimized application performance for better user experience',
    ],
  },
  {
    id: '2',
    jobTitle: 'Frontend Developer',
    companyName: 'Microsoft',
    startDate: { month: 'Jun' as Month, year: '2019' },
    endDate: { month: 'Dec' as Month, year: '2022', isPresent: false },
    location: 'Redmond, WA',
    bulletPoints: [
      'Built responsive UI components using TypeScript and React hooks',
      'Implemented state management solutions with Redux and Context API',
      'Improved accessibility compliance across multiple web applications',
      'Developed and maintained web applications using React and Node.js',
    ],
  },
]

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
  fileId: string
}

export const ResumeForm: React.FC = () => {
  const [formValues, setFormValues] = useState<FormFields>({
    experience: '',
    jobDescription: '',
    numBulletsPerExperience: 0,
    maxCharsPerBullet: 0,
  })

  const [sessionId, setSessionId] = useState<string>('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [experienceData, setExperienceData] =
    useState<ExperienceBlockData[]>(dummyExperienceData)
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

  // Placeholder until user authentication is implemented
  // sessionId will be replaced with user id
  useEffect(() => {
    const storedId = window.localStorage.getItem('sessionId')
    if (storedId) {
      setSessionId(storedId)
    } else {
      const newId = uuidv4()
      window.localStorage.setItem('sessionId', newId)
      setSessionId(newId)
    }
  }, [])

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

  const handlePDFGeneration = async () => {
    try {
      setPdfGenerating(true)

      const payload = {
        sessionId,
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

      const fileId = apiResult.data.fileId
      const downloadResponse = await fetch(
        `/api/download-pdf/${fileId}?sessionId=${sessionId}`
      )

      if (!downloadResponse.ok) {
        console.error('Failed to download PDF')
      }

      const blob = await downloadResponse.blob()

      saveAs(blob, 'resume.pdf')
    } catch (error) {
      console.error('API error:', error)
    } finally {
      setPdfGenerating(false)
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
        disabled={
          !state?.generatedSections?.length || isPending || pdfGenerating
        }
        onClick={handlePDFGeneration}
      >
        Generate PDF
      </button>

      {experienceData.map((experience, index) => (
        <ExperienceBlock
          key={experience.id}
          id={experience.id}
          data={experience}
          onUpdate={(id, data) => {
            const updatedExperienceData = experienceData.map((exp) =>
              exp.id === id ? data : exp
            )
            setExperienceData(updatedExperienceData)
          }}
          onDelete={(id) => {
            const updatedExperienceData = experienceData.filter(
              (exp) => exp.id !== id
            )
            setExperienceData(updatedExperienceData)
          }}
        />
      ))}
    </form>
  )
}
