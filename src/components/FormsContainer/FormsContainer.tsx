'use client'
import styles from './FormsContainer.module.scss'
import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveAs } from 'file-saver'
import { ExperienceBlockData } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import ResumePreview from '@/components/ResumePreview/ResumePreview'
import PersonalDetails, {
  PersonalDetailsFormValues,
} from '@/components/PersonalDetails/PersonalDetails'
import WorkExperience from '../Experience/WorkExperience/WorkExperience'
import { Settings, SettingsFormValues } from '../Settings/Settings'
import { JobDescription } from '../JobDescription/JobDescription'
import Projects from '../Projects/Projects/Projects'
import { ProjectBlockData } from '../Projects/EditableProjectBlock/EditableProjectBlock'
import { ROUTES } from '@/lib/constants'
import { JobDescriptionAnalysis } from '@/app/api/analyze-job-description/route'
import { JobDescriptionAnalysisSchema } from '@/lib/validationSchemas'

const Tabs = {
  PERSONAL_DETAILS: 'PersonalDetails',
  EXPERIENCE: 'Experience',
  PROJECTS: 'Projects',
  JOB_DESCRIPTION: 'JobDescription',
  EDUCATION: 'Education',
  SKILLS: 'Skills',
  SETTINGS: 'Settings',
} as const

const StorageKeys = {
  SESSION_ID: 'resumint_sessionId',
  JOB_DESCRIPTION: 'resumint_jobDescription',
  JOB_DESCRIPTION_ANALYSIS: 'resumint_jobDescriptionAnalysis',
  PERSONAL_DETAILS: 'resumint_personalDetails',
  EXPERIENCE: 'resumint_experience',
  PROJECTS: 'resumint_projects',
  SETTINGS: 'resumint_settings',
} as const

interface MintResumePayload {
  sessionId: string
  personalDetails: PersonalDetailsFormValues
  workExperience: ExperienceBlockData[]
  projects: ProjectBlockData[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  settings: SettingsFormValues
}

const tabs = [
  { id: Tabs.JOB_DESCRIPTION, label: 'Job Description' },
  { id: Tabs.PERSONAL_DETAILS, label: 'Personal Details' },
  { id: Tabs.EXPERIENCE, label: 'Experience' },
  { id: Tabs.PROJECTS, label: 'Projects' },
  { id: Tabs.SETTINGS, label: 'Settings' },
  // { id: Tabs.EDUCATION, label: 'Education' },
  // { id: Tabs.SKILLS, label: 'Skills' },
]

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
const initialJobDescriptionAnalysis: JobDescriptionAnalysis = {
  skillsRequired: { hard: [], soft: [] },
  jobTitle: '',
  jobSummary: '',
  specialInstructions: '',
  location: { type: 'remote', details: '', listedLocation: '' },
  companyName: '',
  companyDescription: '',
  contextualTechnologies: [],
}
const initialProjects: ProjectBlockData[] = []

export const FormsContainer: React.FC = () => {
  // Application States
  const [sessionId, setSessionId] = useState<string>('')

  // UI States
  const [view, setView] = useState<'input' | 'preview'>('input')
  const [activeTab, setActiveTab] = useState<string>(Tabs.JOB_DESCRIPTION)
  const [mintingResume, setMintingResume] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyzingJob, setAnalyzingJob] = useState(false)

  // Form States
  const [jobDescription, setJobDescription] = useState<string>(
    initialJobDescription
  )
  const [jobDescriptionAnalysis, setJobDescriptionAnalysis] =
    useState<JobDescriptionAnalysis>(initialJobDescriptionAnalysis)
  const [personalDetails, setPersonalDetails] =
    useState<PersonalDetailsFormValues>(initialPersonalDetails)
  const [workExperience, setWorkExperience] = useState<ExperienceBlockData[]>(
    initialWorkExperience
  )
  const [projects, setProjects] = useState<ProjectBlockData[]>(initialProjects)
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

  // Load job description analysis
  useEffect(() => {
    setLoading(true)
    const storedAnalysis = window.localStorage.getItem(
      StorageKeys.JOB_DESCRIPTION_ANALYSIS
    )
    if (storedAnalysis) {
      setJobDescriptionAnalysis(JSON.parse(storedAnalysis))
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

  // Load experience
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

  // Load projects
  useEffect(() => {
    setLoading(true)
    const storedProjects = window.localStorage.getItem(StorageKeys.PROJECTS)
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects))
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

      // TODO: pass generated bullets to server?
      const payload: MintResumePayload = {
        sessionId,
        jobDescriptionAnalysis,
        workExperience,
        projects,
        personalDetails,
        settings,
      }

      const response = await fetch(ROUTES.MINT_RESUME, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const pdfBlob = await response.blob()
        saveAs(
          pdfBlob,
          `${personalDetails.name
            .replace(/\s+/g, '-')
            .toLowerCase()}-resume.pdf`
        )
      } else {
        const errorData = await response.json()
        console.error('API error:', errorData)
      }
    } catch (error) {
      console.error('API error:', error)
    } finally {
      setMintingResume(false)
    }
  }

  const handleJobDescriptionSave = async (data: string) => {
    setJobDescription(data)
    localStorage.setItem(StorageKeys.JOB_DESCRIPTION, data)

    try {
      setAnalyzingJob(true)

      const response = await fetch(ROUTES.ANALYZE_JOB_DESCRIPTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, jobDescription: data }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
      }

      const result = await response.json()
      if (result.status !== 'success' || !result.data || result.errors) {
        console.error('Invalid analysis response', result.errors)
      }

      const validationResult = JobDescriptionAnalysisSchema.safeParse(
        result.data
      )
      if (!validationResult.success) {
        console.error('Validation errors:', validationResult.error.flatten())
      }

      const analysis = validationResult.data as JobDescriptionAnalysis
      setJobDescriptionAnalysis(analysis)
      localStorage.setItem(
        StorageKeys.JOB_DESCRIPTION_ANALYSIS,
        JSON.stringify(analysis)
      )
    } catch (error) {
      console.error('Job analysis error:', error)
    } finally {
      setAnalyzingJob(false)
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

  const handleProjectsSave = (data: ProjectBlockData[]) => {
    setProjects(data)
    if (data.length > 0) {
      localStorage.setItem(StorageKeys.PROJECTS, JSON.stringify(data))
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
              analyzing={analyzingJob}
              jobDescriptionAnalysis={jobDescriptionAnalysis}
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
          {activeTab === Tabs.PROJECTS && (
            <Projects
              data={projects}
              loading={loading}
              jobDescriptionAnalysis={jobDescriptionAnalysis}
              settings={settings}
              onSave={handleProjectsSave}
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
        disabled={mintingResume || analyzingJob}
        onClick={handleMintResume}
      >
        {mintingResume ? 'Minting...' : 'Mint Resume!'}
      </button>
    </div>
  )
}
