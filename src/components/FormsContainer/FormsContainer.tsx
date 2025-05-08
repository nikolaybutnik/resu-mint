'use client'
import styles from './FormsContainer.module.scss'
import { useActionState, useState, useEffect } from 'react'
import { z } from 'zod'
import {
  formatErrorsForClient,
  ApiResponse,
  ResponseStatus,
} from '@/lib/types/errors'
import { v4 as uuidv4 } from 'uuid'
import { saveAs } from 'file-saver'
import {
  ExperienceBlockData,
  Month,
} from '@/components/ExperienceBlock/ExperienceBlock'
import Preview from '@/components/ResumePreview/ResumePreview'
import PersonalDetails, {
  PersonalDetailsFormValues,
} from '@/components/PersonalDetails/PersonalDetails'
import WorkExperience from '../WorkExperience/WorkExperience'

enum Tabs {
  PERSONAL_DETAILS = 'PersonalDetails',
  JOB_DESCRIPTION = 'JobDescription',
  WORK_EXPERIENCE = 'WorkExperience',
  EDUCATION = 'Education',
  SKILLS = 'Skills',
}

const tabs = [
  { id: Tabs.PERSONAL_DETAILS, label: 'Personal Details' },
  { id: Tabs.WORK_EXPERIENCE, label: 'Work Experience' },
  // { id: Tabs.JOB_DESCRIPTION, label: 'Job Description' },
  // { id: Tabs.EDUCATION, label: 'Education' },
  // { id: Tabs.SKILLS, label: 'Skills' },
]

// TODO: retire this schema when job description tab is in place
const formSchema = z.object({
  experience: z
    .string()
    .min(10, 'Experience must be at least 10 characters')
    .nonempty('Experience is required'),
  jobDescription: z
    .string()
    .min(10, 'Job description must be at least 10 characters')
    .nonempty('Experience is required'),
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

const initialPersonalDetails: PersonalDetailsFormValues = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
}
const initialWorkExperience: ExperienceBlockData[] = []

export const FormsContainer: React.FC = () => {
  // TODO: retire this formValues state when job description tab is in place
  const [formValues, setFormValues] = useState<FormFields>({
    experience: '',
    jobDescription: '',
    numBulletsPerExperience: 0,
    maxCharsPerBullet: 0,
  })

  // Application States
  const [sessionId, setSessionId] = useState<string>('')

  // UI States
  const [view, setView] = useState<'input' | 'preview'>('input')
  const [activeTab, setActiveTab] = useState<string>(Tabs.WORK_EXPERIENCE)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // Form States
  const [allFormsValidity, setAllFormsValidity] = useState<{
    [key: string]: boolean
  }>({
    personalDetails: false,
    workExperience: false,
  })
  const [personalDetails, setPersonalDetails] =
    useState<PersonalDetailsFormValues>(initialPersonalDetails)
  const [workExperience, setWorkExperience] = useState<ExperienceBlockData[]>(
    initialWorkExperience
  )

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

  // Load personal details
  useEffect(() => {
    const storedPersonalDetails = window.localStorage.getItem(
      'resumint_personalDetails'
    )
    if (storedPersonalDetails) {
      setPersonalDetails(JSON.parse(storedPersonalDetails))
    }
  }, [])

  // Load work experience
  useEffect(() => {
    const storedWorkExperience = window.localStorage.getItem(
      'resumint_workExperience'
    )
    if (storedWorkExperience) {
      setWorkExperience(JSON.parse(storedWorkExperience))
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

  const handlePersonalDetailsUpdate = (data: PersonalDetailsFormValues) => {
    setPersonalDetails(data)
  }

  const handlePersonalDetailsSave = ({
    data,
    isValid,
  }: {
    data: PersonalDetailsFormValues
    isValid: boolean
  }) => {
    setAllFormsValidity((prev) => ({ ...prev, personalDetails: isValid }))
    if (isValid) {
      localStorage.setItem('resumint_personalDetails', JSON.stringify(data))
    }
  }

  const handleWorkExperienceUpdate = (data: ExperienceBlockData[]) => {
    setWorkExperience(data)
  }

  const handleWorkExperienceSave = ({
    data,
    isValid,
  }: {
    data: ExperienceBlockData[]
    isValid: boolean
  }) => {
    setAllFormsValidity((prev) => ({ ...prev, workExperience: isValid }))
    if (isValid && data.length > 0) {
      localStorage.setItem('resumint_workExperience', JSON.stringify(data))
    }
  }

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
          {activeTab === Tabs.PERSONAL_DETAILS && (
            <PersonalDetails
              data={personalDetails}
              onUpdate={handlePersonalDetailsUpdate}
              onSave={handlePersonalDetailsSave}
            />
          )}
          {activeTab === Tabs.WORK_EXPERIENCE && (
            <WorkExperience
              data={workExperience}
              onUpdate={handleWorkExperienceUpdate}
              onSave={handleWorkExperienceSave}
            />
          )}

          {/* TODO: this button needs to be moved somewhere easier to reach */}
          <button
            type='button'
            className={styles.formButton}
            disabled={
              !allFormsValidity.personalDetails ||
              !allFormsValidity.workExperience ||
              !state?.generatedSections?.length ||
              isPending ||
              pdfGenerating
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
