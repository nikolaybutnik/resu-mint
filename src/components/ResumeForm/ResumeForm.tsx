'use client'
import styles from './ResumeForm.module.scss'
import {
  useActionState,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
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
import Preview from '@/components/ResumePreview/ResumePreview'

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

const tabs = [
  { id: 'PersonalDetails', label: 'Personal Details' },
  { id: 'JobDescription', label: 'Job Description' },
  { id: 'WorkExperience', label: 'Work Experience' },
  { id: 'Education', label: 'Education' },
  { id: 'Skills', label: 'Skills' },
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
  const [activeTab, setActiveTab] = useState<string>('JobDescription')
  const [view, setView] = useState<'input' | 'preview'>('input')

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

  const onUpdate = useCallback((id: string, data: ExperienceBlockData) => {
    setExperienceData((prev) =>
      prev.map((exp) => (exp.id === id ? { ...data, id: exp.id } : exp))
    )
  }, [])

  const onDelete = useCallback((id: string) => {
    setExperienceData((prev) => prev.filter((exp) => exp.id !== id))
  }, [])

  const addExperienceBlock = useCallback(() => {
    const newBlock: ExperienceBlockData = {
      id: uuidv4(),
      jobTitle: '',
      startDate: { month: 'Jan' as Month, year: '' },
      endDate: { month: '', year: '', isPresent: false },
      companyName: '',
      location: '',
      bulletPoints: [''],
    }
    setExperienceData((prev) => [...prev, newBlock])
  }, [])

  const experienceBlocks = useMemo(() => {
    return experienceData.map((experience) => (
      <ExperienceBlock
        key={experience.id}
        id={experience.id}
        data={experience}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    ))
  }, [experienceData])

  return (
    <div className={styles.container}>
      <div
        className={`${styles.sidebar} ${view === 'input' ? styles.active : ''}`}
      >
        <div className={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${
                activeTab === tab.id ? styles.activeTab : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.tabContent}>
          {activeTab === 'PersonalDetails' && (
            <div className={styles.section}>
              <h2>Personal Details</h2>
              <input
                name='name'
                placeholder='Full Name'
                className={styles.formInput}
                // value={formValues.name || ''}
                onChange={handleChange}
              />
              <input
                name='email'
                placeholder='Email'
                className={styles.formInput}
                // value={formValues.email || ''}
                onChange={handleChange}
              />
              <input
                name='phone'
                placeholder='Phone'
                className={styles.formInput}
                // value={formValues.phone || ''}
                onChange={handleChange}
              />
            </div>
          )}
          {activeTab === 'JobDescription' && (
            <form className={styles.section} action={formAction}>
              <h2>Job Description</h2>
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
                <p className={styles.errorMessage}>
                  {state.errors.jobDescription}
                </p>
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
                <p className={styles.errorMessage}>
                  {state.errors.maxCharsPerBullet}
                </p>
              )}
              <button
                type='submit'
                className={styles.formButton}
                disabled={isPending}
              >
                Generate Bullets
              </button>
            </form>
          )}
          {activeTab === 'WorkExperience' && (
            <div className={styles.section}>
              <h2>Work Experience</h2>
              <button
                type='button'
                className={styles.formButton}
                onClick={addExperienceBlock}
              >
                Add Experience
              </button>
              {experienceBlocks}
            </div>
          )}
          {activeTab === 'Education' && (
            <div className={styles.section}>
              <h2>Education</h2>
              <p>Add education details here.</p>
            </div>
          )}
          {activeTab === 'Skills' && (
            <div className={styles.section}>
              <h2>Skills</h2>
              <p>Add skills here (AI-generated in future).</p>
            </div>
          )}
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
        </div>
      </div>
      <div
        className={`${styles.preview} ${
          view === 'preview' ? styles.active : ''
        }`}
      >
        <Preview />
      </div>
      <div className={styles.bottomNav}>
        <button className={styles.navItem} onClick={() => setView('input')}>
          Input
        </button>
        <button className={styles.navItem} onClick={() => setView('preview')}>
          Preview
        </button>
      </div>
    </div>
  )
}
