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
import { ExperienceBlockData } from '@/components/EditableExperienceBlock/EditableExperienceBlock'
import ResumePreview from '@/components/ResumePreview/ResumePreview'
import PersonalDetails, {
  PersonalDetailsFormValues,
} from '@/components/PersonalDetails/PersonalDetails'
import WorkExperience from '../WorkExperience/WorkExperience'

enum Tabs {
  PERSONAL_DETAILS = 'PersonalDetails',
  EXPERIENCE = 'Experience',
  PROJECTS = 'Projects',
  JOB_DESCRIPTION = 'JobDescription',
  EDUCATION = 'Education',
  SKILLS = 'Skills',
}

enum StorageKeys {
  SESSION_ID = 'resumint_sessionId',
  PERSONAL_DETAILS = 'resumint_personalDetails',
  EXPERIENCE = 'resumint_experience',
}

const tabs = [
  { id: Tabs.PERSONAL_DETAILS, label: 'Personal Details' },
  { id: Tabs.EXPERIENCE, label: 'Experience' },
  // { id: Tabs.PROJECTS, label: 'Projects' },
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
  const [activeTab, setActiveTab] = useState<string>(Tabs.EXPERIENCE)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // Form States
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
  useEffect(() => {
    const storedId = window.localStorage.getItem(StorageKeys.SESSION_ID)
    if (storedId) {
      setSessionId(storedId)
    } else {
      const newId = uuidv4()
      window.localStorage.setItem(StorageKeys.SESSION_ID, newId)
      setSessionId(newId)
    }
  }, [])

  // Load personal details
  useEffect(() => {
    const storedPersonalDetails = window.localStorage.getItem(
      StorageKeys.PERSONAL_DETAILS
    )
    if (storedPersonalDetails) {
      setPersonalDetails(JSON.parse(storedPersonalDetails))
    }
  }, [])

  // Load work experience
  useEffect(() => {
    const storedWorkExperience = window.localStorage.getItem(
      StorageKeys.EXPERIENCE
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

  // const handleChange = (
  //   event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  // ) => {
  //   const { name, value } = event.target
  //   setFormValues((prev) => ({
  //     ...prev,
  //     [name]:
  //       name === 'numBulletsPerExperience' || name === 'maxCharsPerBullet'
  //         ? Number(value) || 0
  //         : value,
  //   }))
  // }

  const handlePDFGeneration = async () => {
    try {
      setPdfGenerating(true)

      const payload = {
        sessionId,
        name: personalDetails.name || 'John Doe',
        email: personalDetails.email || 'john.doe@example.com',
        phone: personalDetails.phone || '1234567890',
        workExperience,
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

  const handlePersonalDetailsSave = (data: PersonalDetailsFormValues) => {
    setPersonalDetails(data)
    localStorage.setItem(StorageKeys.PERSONAL_DETAILS, JSON.stringify(data))
  }

  const handleWorkExperienceSave = (data: ExperienceBlockData[]) => {
    setWorkExperience(data)
    if (data.length > 0) {
      localStorage.setItem(StorageKeys.EXPERIENCE, JSON.stringify(data))
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
              onSave={handlePersonalDetailsSave}
            />
          )}
          {activeTab === Tabs.EXPERIENCE && (
            <WorkExperience
              data={workExperience}
              onSave={handleWorkExperienceSave}
            />
          )}
          <button
            type='button'
            className={styles.formButton}
            disabled={
              !personalDetails.name ||
              !personalDetails.email ||
              !workExperience.length ||
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
        <ResumePreview />
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
