'use client'

import styles from './FormsContainer.module.scss'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ExperienceBlockData } from '@/lib/types/experience'
import ResumePreview from '@/components/ResumePreview/ResumePreview'
import PersonalDetails from '@/components/PersonalDetails/PersonalDetails'
import WorkExperience from '../Experience/WorkExperience/WorkExperience'
import Education from '../Education/Education/Education'
import Settings from '../Settings/Settings'
import { JobDescription } from '../JobDescription/JobDescription'
import Projects from '../Projects/Projects/Projects'
import Skills from '../Skills/Skills'
import { MOBILE_VIEW, ROUTES } from '@/lib/constants'
import {
  jobDescriptionAnalysisSchema,
  parseSectionSkillsResponseSchema,
} from '@/lib/validationSchemas'
import { ProjectBlockData } from '@/lib/types/projects'
import {
  AnalyzeJobDescriptionRequest,
  CreatePdfRequest,
  JobDescriptionAnalysis,
  ParseSectionSkillsRequest,
  ParseSectionSkillsResponse,
} from '@/lib/types/api'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { AppSettings, LanguageModel } from '@/lib/types/settings'
import { EducationBlockData } from '@/lib/types/education'
import saveAs from 'file-saver'
import { api, pdfService } from '@/lib/services'
import { useKeywordAnalysis } from '@/lib/hooks/useKeywordAnalysis'

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
  SKILLS: 'resumint_skills',
} as const

const tabs = [
  { id: Tabs.JOB_DETAILS, label: 'Job Details' },
  { id: Tabs.PERSONAL_DETAILS, label: 'Personal Details' },
  { id: Tabs.EXPERIENCE, label: 'Experience' },
  { id: Tabs.PROJECTS, label: 'Projects' },
  { id: Tabs.EDUCATION, label: 'Education' },
  { id: Tabs.SKILLS, label: 'Skills' },
  { id: Tabs.SETTINGS, label: 'Settings' },
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
const initialSkills: {
  hardSkills: string[]
  softSkills: string[]
} = {
  hardSkills: [],
  softSkills: [],
}

const normalizeForComparison = (skill: string): string => {
  return skill.trim().toLowerCase().replace(/\s+/g, ' ')
}

const buildResumeData = (
  personalDetails: PersonalDetailsType,
  workExperience: ExperienceBlockData[],
  projects: ProjectBlockData[],
  education: EducationBlockData[]
): CreatePdfRequest => {
  return {
    personalDetails,
    experienceSection: workExperience,
    projectSection: projects,
    educationSection: education,
  }
}

const isResumeDataValid = (
  personalDetails: PersonalDetailsType,
  workExperience: ExperienceBlockData[],
  projects: ProjectBlockData[],
  education: EducationBlockData[],
  jobDescription: string,
  jobDescriptionAnalysis: JobDescriptionAnalysis
): boolean => {
  // Minimum requirements for a meaningful preview
  const hasBasicInfo =
    !!personalDetails.name.trim() && !!personalDetails.email.trim()
  const hasJobDescription = !!jobDescription.trim()
  const hasAnalyzedJobDetails = !!jobDescriptionAnalysis
  const hasContent =
    workExperience.some((exp) => exp.isIncluded) ||
    projects.some((proj) => proj.isIncluded) ||
    education.some((edu) => edu.isIncluded)

  return (
    hasBasicInfo && hasJobDescription && hasAnalyzedJobDetails && hasContent
  )
}

interface FormsContainerProps {
  view: string
}

export const FormsContainer: React.FC<FormsContainerProps> = ({ view }) => {
  const previousDescriptionsRef = useRef<string>('')
  const isInitialLoadRef = useRef(true)

  // Application States
  const [sessionId, setSessionId] = useState<string>('')

  // UI States
  const [activeTab, setActiveTab] = useState<string>(Tabs.JOB_DETAILS)
  const [mintingResume, setMintingResume] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analyzingJob, setAnalyzingJob] = useState(false)
  const [parsingSkills, setParsingSkills] = useState(false)

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
  const [skills, setSkills] = useState<{
    hardSkills: string[]
    softSkills: string[]
  }>(initialSkills)

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

  // TODO: now that we have access to the skills which maytch the user's experience,
  // these skills will need to be prioritized.
  const keywordData = useKeywordAnalysis(
    workExperience,
    projects,
    jobDescriptionAnalysis
  )

  // TODO: the endpoint is hit when reordering items. Find a way around this.
  useEffect(() => {
    const parseSkills = async () => {
      // Skip if still loading initial data or already parsing
      if (loading || parsingSkills) return

      setParsingSkills(true)

      const experienceSectionDescriptions: string[] = workExperience
        .filter((experience) => experience.isIncluded)
        .map((experience) => experience.description.trim())
      const projectSectionDescriptions: string[] = projects
        .filter((project) => project.isIncluded)
        .map((project) => project.description.trim())

      const combinedDescriptions = [
        ...experienceSectionDescriptions,
        ...projectSectionDescriptions,
      ]
        .filter((desc) => desc.length > 0)
        .join('\n')
        .trim()

      // Skip on first run after loading completes - just set the reference
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
        previousDescriptionsRef.current = combinedDescriptions
        setParsingSkills(false)
        return
      }

      if (combinedDescriptions === previousDescriptionsRef.current) {
        setParsingSkills(false)
        return
      }

      previousDescriptionsRef.current = combinedDescriptions

      try {
        const payload: ParseSectionSkillsRequest = {
          sectionDescriptions: combinedDescriptions,
          settings,
        }

        const response = await api.post<
          ParseSectionSkillsRequest,
          ParseSectionSkillsResponse
        >(ROUTES.PARSE_SECTION_SKILLS, payload)

        const validationResult =
          parseSectionSkillsResponseSchema.safeParse(response)
        if (!validationResult.success) {
          console.error('Validation errors:', validationResult.error.flatten())
          setParsingSkills(false)
          return
        }

        const validatedSkills = validationResult.data

        setSkills((currentSkills) => {
          const existingHardSkillsNormalized = new Set(
            currentSkills.hardSkills.map(normalizeForComparison)
          )
          const existingSoftSkillsNormalized = new Set(
            currentSkills.softSkills.map(normalizeForComparison)
          )

          const newHardSkills = validatedSkills.hardSkills.filter(
            (skill) =>
              !existingHardSkillsNormalized.has(normalizeForComparison(skill))
          )
          const newSoftSkills = validatedSkills.softSkills.filter(
            (skill) =>
              !existingSoftSkillsNormalized.has(normalizeForComparison(skill))
          )

          const updatedSkills = {
            hardSkills: [...currentSkills.hardSkills, ...newHardSkills],
            softSkills: [...currentSkills.softSkills, ...newSoftSkills],
          }

          localStorage.setItem(
            StorageKeys.SKILLS,
            JSON.stringify(updatedSkills)
          )
          return updatedSkills
        })
      } catch (error) {
        console.error('Error parsing skills:', error)
      } finally {
        setParsingSkills(false)
      }
    }

    parseSkills()
  }, [workExperience, projects, loading])

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
      skills: localStorage.getItem(StorageKeys.SKILLS),
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
    if (stored.skills) {
      const parsedSkills = JSON.parse(stored.skills) as {
        hardSkills: string[]
        softSkills: string[]
      }

      // Remove duplicates from loaded skills using normalized comparison but preserve original capitalization
      const deduplicatedSkills = {
        hardSkills: parsedSkills.hardSkills.filter(
          (skill, index, array) =>
            array.findIndex(
              (s) => normalizeForComparison(s) === normalizeForComparison(skill)
            ) === index
        ),
        softSkills: parsedSkills.softSkills.filter(
          (skill, index, array) =>
            array.findIndex(
              (s) => normalizeForComparison(s) === normalizeForComparison(skill)
            ) === index
        ),
      }

      setSkills(deduplicatedSkills)
      localStorage.setItem(
        StorageKeys.SKILLS,
        JSON.stringify(deduplicatedSkills)
      )
    } else {
      localStorage.setItem(StorageKeys.SKILLS, JSON.stringify(initialSkills))
      setSkills(initialSkills)
    }
    setLoading(false)
  }, [])

  const handleMintResume = async () => {
    try {
      setMintingResume(true)

      const payload: CreatePdfRequest = {
        personalDetails,
        experienceSection: workExperience,
        projectSection: projects,
        educationSection: education,
      }

      const pdfBlob = await pdfService.createPdf(payload)
      saveAs(
        pdfBlob,
        `${personalDetails.name.replace(/\s+/g, '-').toLowerCase()}-resume.pdf`
      )
    } catch (error) {
      console.error('PDF creation error:', error)
    } finally {
      setMintingResume(false)
    }
  }

  const handleJobDescriptionSave = async (data: string) => {
    setJobDescription(data)
    localStorage.setItem(StorageKeys.JOB_DESCRIPTION, data)

    try {
      setAnalyzingJob(true)

      const payload: AnalyzeJobDescriptionRequest = {
        sessionId,
        jobDescription: data,
        settings,
      }

      const response = await api.post<
        AnalyzeJobDescriptionRequest,
        JobDescriptionAnalysis
      >(ROUTES.ANALYZE_JOB_DESCRIPTION, payload)

      const validationResult = jobDescriptionAnalysisSchema.safeParse(response)
      if (!validationResult.success) {
        console.error('Validation errors:', validationResult.error.flatten())
        return
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

  const handleSkillsSave = useCallback(
    (data: { hardSkills: string[]; softSkills: string[] }) => {
      setSkills(data)
      localStorage.setItem(StorageKeys.SKILLS, JSON.stringify(data))
    },
    []
  )

  const shouldDisableMintButton = useMemo(() => {
    return (
      mintingResume ||
      analyzingJob ||
      !jobDescription ||
      !jobDescriptionAnalysis ||
      !personalDetails.name ||
      !personalDetails.email
    )
  }, [
    mintingResume,
    analyzingJob,
    jobDescription,
    jobDescriptionAnalysis,
    personalDetails,
  ])

  // Memoize fairly stable states. States like projects and experience are updated too often.
  const memoizedSettings = useMemo(() => settings, [settings])
  const memoizedJobDescriptionAnalysis = useMemo(
    () => jobDescriptionAnalysis,
    [jobDescriptionAnalysis]
  )

  const resumeData = useMemo(() => {
    if (loading) return null

    return buildResumeData(personalDetails, workExperience, projects, education)
  }, [personalDetails, workExperience, projects, education, loading])

  const isDataValid = useMemo(() => {
    if (loading || !resumeData) return false

    return isResumeDataValid(
      personalDetails,
      workExperience,
      projects,
      education,
      jobDescription,
      jobDescriptionAnalysis
    )
  }, [
    personalDetails,
    workExperience,
    projects,
    education,
    loading,
    resumeData,
    jobDescription,
    jobDescriptionAnalysis,
  ])

  return (
    <div className={styles.formsContainer}>
      <div
        className={`${styles.sidebar} ${
          view === MOBILE_VIEW.INPUT ? styles.active : ''
        }`}
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
              keywordData={keywordData}
              loading={loading}
              jobDescriptionAnalysis={memoizedJobDescriptionAnalysis}
              settings={memoizedSettings}
              onSave={handleWorkExperienceSave}
            />
          )}
          {activeTab === Tabs.PROJECTS && (
            <Projects
              data={projects}
              keywordData={keywordData}
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
          {activeTab === Tabs.SKILLS && (
            <Skills data={skills} loading={loading} onSave={handleSkillsSave} />
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
          view === MOBILE_VIEW.PREVIEW ? styles.active : ''
        }`}
      >
        <ResumePreview resumeData={resumeData} isDataValid={isDataValid} />
      </div>

      {/* TODO: Temporarily hide the minting button. PDF download will be reworked as part of live preview feature */}
      <button
        type='button'
        className={styles.mintButton}
        style={{ display: 'none' }}
        disabled={shouldDisableMintButton}
        onClick={handleMintResume}
      >
        {mintingResume ? 'Minting...' : 'Mint Resume!'}
      </button>
    </div>
  )
}
