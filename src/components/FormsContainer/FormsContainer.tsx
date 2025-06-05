'use client'
import styles from './FormsContainer.module.scss'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { saveAs } from 'file-saver'
import { ExperienceBlockData } from '@/lib/types/experience'
import ResumePreview from '@/components/ResumePreview/ResumePreview'
import PersonalDetails from '@/components/PersonalDetails/PersonalDetails'
import WorkExperience from '../Experience/WorkExperience/WorkExperience'
import Education from '../Education/Education/Education'
import Settings from '../Settings/Settings'
import { JobDescription } from '../JobDescription/JobDescription'
import Projects from '../Projects/Projects/Projects'
import { ROUTES } from '@/lib/constants'
import { jobDescriptionAnalysisSchema } from '@/lib/validationSchemas'
import { ProjectBlockData } from '@/lib/types/projects'
import { MintResumeRequest, JobDescriptionAnalysis } from '@/lib/types/api'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { AppSettings, LanguageModel } from '@/lib/types/settings'
import { EducationBlockData } from '@/lib/types/education'

const Tabs = {
  PERSONAL_DETAILS: 'PersonalDetails',
  EXPERIENCE: 'Experience',
  PROJECTS: 'Projects',
  JOB_DETAILS: 'JobDetails',
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
  EDUCATION: 'resumint_education',
  SETTINGS: 'resumint_settings',
} as const

const tabs = [
  { id: Tabs.JOB_DETAILS, label: 'Job Details' },
  { id: Tabs.PERSONAL_DETAILS, label: 'Personal Details' },
  { id: Tabs.EXPERIENCE, label: 'Experience' },
  { id: Tabs.PROJECTS, label: 'Projects' },
  { id: Tabs.EDUCATION, label: 'Education' },
  { id: Tabs.SETTINGS, label: 'Settings' },
  // { id: Tabs.SKILLS, label: 'Skills' },
]

const initialPersonalDetails: PersonalDetailsType = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
}
const initialWorkExperience: ExperienceBlockData[] = []
const initialSettings: AppSettings = {
  bulletsPerExperienceBlock: 4,
  bulletsPerProjectBlock: 3,
  maxCharsPerBullet: 125,
  languageModel: LanguageModel.GPT_4O_MINI,
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
  salaryRange: '',
}
const initialProjects: ProjectBlockData[] = []
const initialEducation: EducationBlockData[] = []

export const FormsContainer: React.FC = () => {
  // Application States
  const [sessionId, setSessionId] = useState<string>('')

  // UI States
  const [view, setView] = useState<'input' | 'preview'>('input')
  const [activeTab, setActiveTab] = useState<string>(Tabs.JOB_DETAILS)
  const [mintingResume, setMintingResume] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyzingJob, setAnalyzingJob] = useState(false)

  // Form States
  const [jobDescription, setJobDescription] = useState<string>(
    initialJobDescription
  )
  const [jobDescriptionAnalysis, setJobDescriptionAnalysis] =
    useState<JobDescriptionAnalysis>(initialJobDescriptionAnalysis)
  const [personalDetails, setPersonalDetails] = useState<PersonalDetailsType>(
    initialPersonalDetails
  )
  const [workExperience, setWorkExperience] = useState<ExperienceBlockData[]>(
    initialWorkExperience
  )
  const [projects, setProjects] = useState<ProjectBlockData[]>(initialProjects)
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [education, setEducation] =
    useState<EducationBlockData[]>(initialEducation)

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

  useEffect(() => {
    setLoading(true)
    const stored = {
      jobDescription: localStorage.getItem(StorageKeys.JOB_DESCRIPTION),
      analysis: localStorage.getItem(StorageKeys.JOB_DESCRIPTION_ANALYSIS),
      personalDetails: localStorage.getItem(StorageKeys.PERSONAL_DETAILS),
      workExperience: localStorage.getItem(StorageKeys.EXPERIENCE),
      projects: localStorage.getItem(StorageKeys.PROJECTS),
      education: localStorage.getItem(StorageKeys.EDUCATION),
      settings: localStorage.getItem(StorageKeys.SETTINGS),
    }
    if (stored.jobDescription) setJobDescription(stored.jobDescription)
    if (stored.analysis) setJobDescriptionAnalysis(JSON.parse(stored.analysis))
    if (stored.personalDetails)
      setPersonalDetails(JSON.parse(stored.personalDetails))
    if (stored.workExperience)
      setWorkExperience(JSON.parse(stored.workExperience))
    if (stored.projects) setProjects(JSON.parse(stored.projects))
    if (stored.education) setEducation(JSON.parse(stored.education))
    if (stored.settings) {
      setSettings(JSON.parse(stored.settings))
    } else {
      localStorage.setItem(
        StorageKeys.SETTINGS,
        JSON.stringify(initialSettings)
      )
      setSettings(initialSettings)
    }
    setLoading(false)
  }, [])

  // TODO: Implement when details of functionality are finalized
  const handleMintResume = async () => {
    // try {
    //   setMintingResume(true)
    //   const payload: MintResumeRequest = {
    //     sessionId,
    //     jobDescriptionAnalysis,
    //     workExperience,
    //     projects,
    //     personalDetails,
    //     settings,
    //   }
    //   const response = await fetch(ROUTES.MINT_RESUME, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload),
    //   })
    //   if (response.ok) {
    //     const pdfBlob = await response.blob()
    //     saveAs(
    //       pdfBlob,
    //       `${personalDetails.name
    //         .replace(/\s+/g, '-')
    //         .toLowerCase()}-resume.pdf`
    //     )
    //   } else {
    //     const errorData = await response.json()
    //     console.error('API error:', errorData)
    //   }
    // } catch (error) {
    //   console.error('API error:', error)
    // } finally {
    //   setMintingResume(false)
    // }
  }

  const handleJobDescriptionSave = async (data: string) => {
    setJobDescription(data)
    localStorage.setItem(StorageKeys.JOB_DESCRIPTION, data)

    try {
      setAnalyzingJob(true)

      const response = await fetch(ROUTES.ANALYZE_JOB_DESCRIPTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          jobDescription: data,
          settings,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
      }

      const result = await response.json()
      if (result.status !== 'success' || !result.data || result.errors) {
        console.error('Invalid analysis response', result.errors)
      }

      const validationResult = jobDescriptionAnalysisSchema.safeParse(
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

  const handlePersonalDetailsSave = (data: PersonalDetailsType) => {
    setPersonalDetails(data)
    localStorage.setItem(StorageKeys.PERSONAL_DETAILS, JSON.stringify(data))
  }

  const handleWorkExperienceSave = (data: ExperienceBlockData[]) => {
    setWorkExperience(data)
    if (data.length > 0) {
      localStorage.setItem(StorageKeys.EXPERIENCE, JSON.stringify(data))
    }
  }

  const handleProjectsSave = useCallback((data: ProjectBlockData[]) => {
    setProjects(data)
    if (data.length > 0) {
      localStorage.setItem(StorageKeys.PROJECTS, JSON.stringify(data))
    }
  }, [])

  const handleEducationSave = useCallback((data: EducationBlockData[]) => {
    setEducation(data)
    if (data.length > 0) {
      localStorage.setItem(StorageKeys.EDUCATION, JSON.stringify(data))
    }
  }, [])

  const handleSettingsSave = (data: AppSettings) => {
    setSettings(data)
    localStorage.setItem(StorageKeys.SETTINGS, JSON.stringify(data))
  }

  // Memoize fairly stable states. States like projects and experience are updated too often.
  const memoizedSettings = useMemo(() => settings, [settings])
  const memoizedJobDescriptionAnalysis = useMemo(
    () => jobDescriptionAnalysis,
    [jobDescriptionAnalysis]
  )

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
          {activeTab === Tabs.JOB_DETAILS && (
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
              jobDescriptionAnalysis={memoizedJobDescriptionAnalysis}
              settings={memoizedSettings}
              onSave={handleWorkExperienceSave}
            />
          )}
          {activeTab === Tabs.PROJECTS && (
            <Projects
              data={projects}
              loading={loading}
              jobDescriptionAnalysis={memoizedJobDescriptionAnalysis}
              settings={memoizedSettings}
              onSave={handleProjectsSave}
            />
          )}
          {activeTab === Tabs.EDUCATION && (
            <Education
              data={education}
              loading={loading}
              onSave={handleEducationSave}
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
        // disabled={mintingResume || analyzingJob}
        disabled={true}
        onClick={handleMintResume}
      >
        {mintingResume ? 'Minting...' : 'Mint Resume!'}
      </button>
    </div>
  )
}
