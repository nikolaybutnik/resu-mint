'use client'
import styles from './FormsContainer.module.scss'
import { useState, useEffect } from 'react'
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
import { Settings, SettingsFormValues } from '../Settings/Settings'
import { JobDescription } from '../JobDescription/JobDescription'

enum Tabs {
  PERSONAL_DETAILS = 'PersonalDetails',
  EXPERIENCE = 'Experience',
  PROJECTS = 'Projects',
  JOB_DESCRIPTION = 'JobDescription',
  EDUCATION = 'Education',
  SKILLS = 'Skills',
  SETTINGS = 'Settings',
}

enum StorageKeys {
  SESSION_ID = 'resumint_sessionId',
  JOB_DESCRIPTION = 'resumint_jobDescription',
  PERSONAL_DETAILS = 'resumint_personalDetails',
  EXPERIENCE = 'resumint_experience',
  SETTINGS = 'resumint_settings',
}

interface MintResumePayload {
  sessionId: string
  personalDetails: PersonalDetailsFormValues
  workExperience: ExperienceBlockData[]
  jobDescription: string
  settings: SettingsFormValues
}

const tabs = [
  { id: Tabs.JOB_DESCRIPTION, label: 'Job Description' },
  { id: Tabs.PERSONAL_DETAILS, label: 'Personal Details' },
  { id: Tabs.EXPERIENCE, label: 'Experience' },
  { id: Tabs.SETTINGS, label: 'Settings' },
  // { id: Tabs.PROJECTS, label: 'Projects' },
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

type GeneratedBulletPointsResponseData = {
  data: { id: string; bullets: string[] }[]
  pdf: string
  status: ResponseStatus
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
const initialSettings: SettingsFormValues = {
  bulletsPerExperienceBlock: 4,
  bulletsPerProjectBlock: 3,
  maxCharsPerBullet: 125,
}
const initialJobDescription: string = ''
export const FormsContainer: React.FC = () => {
  // Application States
  const [sessionId, setSessionId] = useState<string>('')

  // UI States
  const [view, setView] = useState<'input' | 'preview'>('input')
  const [activeTab, setActiveTab] = useState<string>(Tabs.JOB_DESCRIPTION)
  const [mintingResume, setMintingResume] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form States
  const [jobDescription, setJobDescription] = useState<string>(
    initialJobDescription
  )
  const [personalDetails, setPersonalDetails] =
    useState<PersonalDetailsFormValues>(initialPersonalDetails)
  const [workExperience, setWorkExperience] = useState<ExperienceBlockData[]>(
    initialWorkExperience
  )
  const [settings, setSettings] = useState<SettingsFormValues>(initialSettings)

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

  // Load job description
  useEffect(() => {
    setLoading(true)
    const storedJobDescription = window.localStorage.getItem(
      StorageKeys.JOB_DESCRIPTION
    )
    if (storedJobDescription) {
      setJobDescription(storedJobDescription)
    }
    setLoading(false)
  }, [])

  // Load personal details
  useEffect(() => {
    setLoading(true)
    const storedPersonalDetails = window.localStorage.getItem(
      StorageKeys.PERSONAL_DETAILS
    )
    if (storedPersonalDetails) {
      setPersonalDetails(JSON.parse(storedPersonalDetails))
    }
    setLoading(false)
  }, [])

  // Load work experience
  useEffect(() => {
    setLoading(true)
    const storedWorkExperience = window.localStorage.getItem(
      StorageKeys.EXPERIENCE
    )
    if (storedWorkExperience) {
      setWorkExperience(JSON.parse(storedWorkExperience))
    }
    setLoading(false)
  }, [])

  // Load settings
  useEffect(() => {
    setLoading(true)
    const storedSettings = window.localStorage.getItem(StorageKeys.SETTINGS)

    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    } else {
      window.localStorage.setItem(
        StorageKeys.SETTINGS,
        JSON.stringify(initialSettings)
      )
      setSettings(initialSettings)
    }
    setLoading(false)
  }, [])

  const handleMintResume = async () => {
    try {
      setMintingResume(true)

      const payload: MintResumePayload = {
        sessionId,
        jobDescription,
        workExperience,
        personalDetails,
        settings,
      }

      const response = await fetch('/api/mint-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const apiResult =
        (await response.json()) as ApiResponse<GeneratedBulletPointsResponseData>

      if (apiResult.status === ResponseStatus.SUCCESS) {
        if (apiResult.data.pdf) {
          // TODO: do this on the backend
          const byteCharacters = atob(apiResult.data.pdf)
          const byteNumbers = new Array(byteCharacters.length)

          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }

          const byteArray = new Uint8Array(byteNumbers)
          const pdfBlob = new Blob([byteArray], { type: 'application/pdf' })

          saveAs(pdfBlob, 'resume.pdf')
        }
      } else {
        console.error('API error:', apiResult.errors)
      }
    } catch (error) {
      console.error('API error:', error)
    } finally {
      setMintingResume(false)
    }

    // try {
    //   setPdfGenerating(true)

    //   const payload = {
    //     sessionId,
    //     name: personalDetails.name || 'John Doe',
    //     email: personalDetails.email || 'john.doe@example.com',
    //     phone: personalDetails.phone || '1234567890',
    //     workExperience,
    //   }

    //   const response = await fetch('/api/generate-latex', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload),
    //   })

    //   const apiResult =
    //     (await response.json()) as ApiResponse<LatexResponseData>

    //   if (apiResult.status === ResponseStatus.ERROR) {
    //     console.error(apiResult.errors)
    //     return
    //   }

    //   const fileId = apiResult.data.fileId
    //   const downloadResponse = await fetch(
    //     `/api/download-pdf/${fileId}?sessionId=${sessionId}`
    //   )

    //   if (!downloadResponse.ok) {
    //     console.error('Failed to download PDF')
    //   }

    //   const blob = await downloadResponse.blob()

    //   saveAs(blob, 'resume.pdf')
    // } catch (error) {
    //   console.error('API error:', error)
    // } finally {
    //   setPdfGenerating(false)
    // }
  }

  const handleJobDescriptionSave = (data: string) => {
    setJobDescription(data)
    localStorage.setItem(StorageKeys.JOB_DESCRIPTION, data)
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

  const handleSettingsSave = (data: SettingsFormValues) => {
    setSettings(data)
    localStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(data))
  }

  return (
    <div className={styles.formsContainer}>
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
          {activeTab === Tabs.JOB_DESCRIPTION && (
            <JobDescription
              data={jobDescription}
              loading={loading}
              onSave={handleJobDescriptionSave}
            />
          )}
          {activeTab === Tabs.PERSONAL_DETAILS && (
            <PersonalDetails
              data={personalDetails}
              loading={loading}
              onSave={handlePersonalDetailsSave}
            />
          )}
          {activeTab === Tabs.EXPERIENCE && (
            <WorkExperience
              data={workExperience}
              loading={loading}
              onSave={handleWorkExperienceSave}
            />
          )}
          {activeTab === Tabs.SETTINGS && (
            <Settings
              data={settings}
              loading={loading}
              onSave={handleSettingsSave}
            />
          )}
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

      <button
        type='button'
        className={styles.mintButton}
        disabled={mintingResume}
        onClick={handleMintResume}
      >
        {mintingResume ? 'Minting...' : 'Mint Resume!'}
      </button>
    </div>
  )
}
