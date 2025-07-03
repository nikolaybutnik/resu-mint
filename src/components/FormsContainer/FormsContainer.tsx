'use client'

import styles from './FormsContainer.module.scss'
import resumePreviewStyles from '@/components/ResumePreview/ResumePreview.module.scss'
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
import { api, ResponseType } from '@/lib/services'
import { useKeywordAnalysis } from '@/lib/hooks/useKeywordAnalysis'
import {
  FiDownload,
  FiUser,
  FiBriefcase,
  FiFolder,
  FiFileText,
  FiBook,
  FiTool,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import saveAs from 'file-saver'
import LoadingSpinner from '../shared/LoadingSpinner/LoadingSpinner'
import { STORAGE_KEYS } from '@/lib/constants'
import { usePersonalDetailsStore } from '@/stores'

const Tabs = {
  PERSONAL_DETAILS: 'PersonalDetails',
  EXPERIENCE: 'Experience',
  PROJECTS: 'Projects',
  JOB_DETAILS: 'JobDetails',
  EDUCATION: 'Education',
  SKILLS: 'Skills',
  SETTINGS: 'Settings',
} as const

const tabs = [
  {
    id: Tabs.JOB_DETAILS,
    label: 'Job Details',
    shortLabel: 'Job',
    icon: FiFileText,
  },
  {
    id: Tabs.PERSONAL_DETAILS,
    label: 'Personal Details',
    shortLabel: 'Info',
    icon: FiUser,
  },
  {
    id: Tabs.EXPERIENCE,
    label: 'Experience',
    shortLabel: 'Work',
    icon: FiBriefcase,
  },
  {
    id: Tabs.PROJECTS,
    label: 'Projects',
    shortLabel: 'Projects',
    icon: FiFolder,
  },
  {
    id: Tabs.EDUCATION,
    label: 'Education',
    shortLabel: 'School',
    icon: FiBook,
  },
  { id: Tabs.SKILLS, label: 'Skills', shortLabel: 'Skills', icon: FiTool },
  {
    id: Tabs.SETTINGS,
    label: 'Settings',
    shortLabel: 'Settings',
    icon: FiSettings,
  },
]

const arraysHaveSameElements = (arr1: string[], arr2: string[]): boolean => {
  if (arr1?.length !== arr2?.length) return false

  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()

  return sorted1.every((item, index) => item === sorted2[index])
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

const getSafariVersion = (): string | null => {
  if (typeof window === 'undefined') return null

  const userAgent = navigator.userAgent
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)

  if (!isSafari) return null

  const versionMatch = userAgent.match(/Version\/(\d+)\.(\d+)/)
  if (!versionMatch) return null

  return `${versionMatch[1]}.${versionMatch[2]}`
}

const isUnsupportedSafari = (): boolean => {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)

  if (!isSafari) return false

  const versionMatch = userAgent.match(/Version\/(\d+)\.(\d+)/)
  if (!versionMatch) return false

  const majorVersion = parseInt(versionMatch[1], 10)
  const minorVersion = parseInt(versionMatch[2], 10)

  // Only Safari 16.4+ is supported
  return majorVersion < 16 || (majorVersion === 16 && minorVersion <= 3)
}

const handleDownload = async (resumeData: CreatePdfRequest): Promise<void> => {
  if (!resumeData) return

  try {
    const blob = await api.post<CreatePdfRequest, Blob>(
      ROUTES.CREATE_PDF,
      resumeData,
      { responseType: ResponseType.BLOB }
    )

    const fileName = `${
      resumeData.personalDetails?.name?.replace(/\s+/g, '_') || 'resume'
    }_${new Date().toISOString().split('T')[0]}.pdf`

    saveAs(blob, fileName)
  } catch (error) {
    console.error('Download failed:', error)
  }
}

interface FormsContainerProps {
  view: string
}

export const FormsContainer: React.FC<FormsContainerProps> = ({ view }) => {
  const previousDescriptionsRef = useRef<{
    experience: string[]
    projects: string[]
  }>({ experience: [], projects: [] })
  const isInitialLoadRef = useRef(true)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const tabNavRef = useRef<HTMLDivElement>(null)

  // Stores
  const { data: personalDetails } = usePersonalDetailsStore()

  // Application States
  const [sessionId, setSessionId] = useState<string>('')

  // UI States
  const [activeTab, setActiveTab] = useState<string>(Tabs.JOB_DETAILS)
  const [loading, setLoading] = useState(true)
  const [analyzingJob, setAnalyzingJob] = useState(false)
  const [parsingSkills, setParsingSkills] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [safariUnsupported, setSafariUnsupported] = useState(false)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)

  // Form States
  const [jobDescription, setJobDescription] = useState<string>(
    initialJobDescription
  )
  const [jobDescriptionAnalysis, setJobDescriptionAnalysis] =
    useState<JobDescriptionAnalysis>(initialJobDescriptionAnalysis)
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

  useEffect(() => {
    setIsClient(true)
    setSafariUnsupported(isUnsupportedSafari())
  }, [])

  // Placeholder until user authentication is implemented
  useEffect(() => {
    const storedId = window.localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    if (storedId) {
      setSessionId(storedId)
    } else {
      const newId = uuidv4()
      window.localStorage.setItem(STORAGE_KEYS.SESSION_ID, newId)
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

  useEffect(() => {
    const parseSkills = async () => {
      if (loading || parsingSkills) return

      const experienceSectionDescriptions: string[] = workExperience
        .filter((experience) => experience.isIncluded)
        .map((experience) => experience.description?.trim() || '')
        .filter((desc) => desc.length)

      const projectSectionDescriptions: string[] = projects
        .filter((project) => project.isIncluded)
        .map((project) => project.description?.trim() || '')
        .filter((desc) => desc.length)

      // Skip on first run after loading completes - just set the reference
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
        previousDescriptionsRef.current = {
          experience: experienceSectionDescriptions,
          projects: projectSectionDescriptions,
        }
        return
      }

      const previousExperience = previousDescriptionsRef.current.experience
      const previousProjects = previousDescriptionsRef.current.projects

      const experienceUnchanged = arraysHaveSameElements(
        experienceSectionDescriptions,
        previousExperience
      )
      const projectsUnchanged = arraysHaveSameElements(
        projectSectionDescriptions,
        previousProjects
      )

      if (experienceUnchanged && projectsUnchanged) {
        return
      }

      previousDescriptionsRef.current = {
        experience: experienceSectionDescriptions,
        projects: projectSectionDescriptions,
      }

      const combinedDescriptions = [
        ...experienceSectionDescriptions,
        ...projectSectionDescriptions,
      ]
        .join('\n')
        .trim()

      try {
        setParsingSkills(true)

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
            STORAGE_KEYS.SKILLS,
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
      jobDescription: localStorage.getItem(STORAGE_KEYS.JOB_DESCRIPTION),
      analysis: localStorage.getItem(STORAGE_KEYS.JOB_DESCRIPTION_ANALYSIS),
      workExperience: localStorage.getItem(STORAGE_KEYS.EXPERIENCE),
      projects: localStorage.getItem(STORAGE_KEYS.PROJECTS),
      education: localStorage.getItem(STORAGE_KEYS.EDUCATION),
      settings: localStorage.getItem(STORAGE_KEYS.SETTINGS),
      skills: localStorage.getItem(STORAGE_KEYS.SKILLS),
    }
    if (stored.jobDescription) setJobDescription(stored.jobDescription)
    if (stored.analysis) setJobDescriptionAnalysis(JSON.parse(stored.analysis))
    if (stored.workExperience)
      setWorkExperience(JSON.parse(stored.workExperience))
    if (stored.projects) setProjects(JSON.parse(stored.projects))
    if (stored.education) setEducation(JSON.parse(stored.education))
    if (stored.settings) {
      setSettings(JSON.parse(stored.settings))
    } else {
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(initialSettings)
      )
      setSettings(initialSettings)
    }
    if (stored.skills) {
      const parsedSkills = JSON.parse(stored.skills) as {
        hardSkills: string[]
        softSkills: string[]
      }

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
        STORAGE_KEYS.SKILLS,
        JSON.stringify(deduplicatedSkills)
      )
    } else {
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(initialSkills))
      setSkills(initialSkills)
    }
    setLoading(false)
  }, [])

  const handleJobDescriptionSave = async (data: string) => {
    setJobDescription(data)
    localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION, data)

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
        STORAGE_KEYS.JOB_DESCRIPTION_ANALYSIS,
        JSON.stringify(analysis)
      )
    } catch (error) {
      console.error('Job analysis error:', error)
    } finally {
      setAnalyzingJob(false)
    }
  }

  const handleWorkExperienceSave = (data: ExperienceBlockData[]) => {
    setWorkExperience(data)
    if (data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.EXPERIENCE, JSON.stringify(data))
    }
  }

  const handleProjectsSave = useCallback((data: ProjectBlockData[]) => {
    setProjects(data)
    if (data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(data))
    }
  }, [])

  const handleEducationSave = useCallback((data: EducationBlockData[]) => {
    setEducation(data)
    if (data.length > 0) {
      localStorage.setItem(STORAGE_KEYS.EDUCATION, JSON.stringify(data))
    }
  }, [])

  const handleSettingsSave = (data: AppSettings) => {
    setSettings(data)
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data))
  }

  const handleSkillsSave = useCallback(
    (data: { hardSkills: string[]; softSkills: string[] }) => {
      setSkills(data)
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(data))
    },
    []
  )

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = 0
    }
  }

  const handleScrollLeft = () => {
    const tabNav = tabNavRef.current
    if (!tabNav) return

    const scrollAmount = tabNav.clientWidth * 0.6 // Scroll by 60% of visible width
    tabNav.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    })
  }

  const handleScrollRight = () => {
    const tabNav = tabNavRef.current
    if (!tabNav) return

    const scrollAmount = tabNav.clientWidth * 0.6 // Scroll by 60% of visible width
    tabNav.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    })
  }

  const checkScrollIndicators = () => {
    const tabNav = tabNavRef.current
    if (!tabNav) return

    const { scrollLeft, scrollWidth, clientWidth } = tabNav
    setShowLeftScroll(scrollLeft > 0)
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1)
  }

  useEffect(() => {
    const tabNav = tabNavRef.current
    if (!tabNav) return

    checkScrollIndicators()

    const handleScroll = () => checkScrollIndicators()
    const handleResize = () => checkScrollIndicators()

    tabNav.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleResize)

    return () => {
      tabNav.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [checkScrollIndicators])

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
        ref={sidebarRef}
        className={`${styles.sidebar} ${
          view === MOBILE_VIEW.INPUT ? styles.active : ''
        }`}
      >
        <div className={styles.tabNavContainer}>
          <div ref={tabNavRef} className={styles.tabNav}>
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  className={`${styles.tabButton} ${
                    activeTab === tab.id ? styles.activeTab : ''
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <IconComponent className={styles.tabIcon} />
                  <span className={styles.tabLabel}>{tab.label}</span>
                  <span className={styles.tabShortLabel}>{tab.shortLabel}</span>
                  <div className={styles.tabTooltip}>{tab.label}</div>
                </button>
              )
            })}
          </div>
          {showLeftScroll && (
            <button
              className={`${styles.scrollIndicator} ${styles.leftIndicator}`}
              onClick={handleScrollLeft}
              aria-label='Scroll tabs left'
            >
              <FiChevronLeft className={styles.scrollArrow} />
            </button>
          )}
          {showRightScroll && (
            <button
              className={`${styles.scrollIndicator} ${styles.rightIndicator}`}
              onClick={handleScrollRight}
              aria-label='Scroll tabs right'
            >
              <FiChevronRight className={styles.scrollArrow} />
            </button>
          )}
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
          {activeTab === Tabs.PERSONAL_DETAILS && <PersonalDetails />}
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
        {!isClient ? (
          <div className={resumePreviewStyles.preview}>
            <div className={resumePreviewStyles.previewHeader}>
              <h2>Live Preview</h2>
            </div>
            <div className={resumePreviewStyles.previewContent}>
              <div className={resumePreviewStyles.emptyState}>
                <LoadingSpinner size='lg' text='Loading PDF viewer...' />
              </div>
            </div>
          </div>
        ) : safariUnsupported ? (
          <div className={resumePreviewStyles.preview}>
            <div className={resumePreviewStyles.previewHeader}>
              <h2>Live Preview</h2>
            </div>
            <div className={resumePreviewStyles.previewContent}>
              <div className={resumePreviewStyles.emptyState}>
                <h3>Browser Not Supported</h3>
                <p>
                  Safari {getSafariVersion()} is not supported for PDF preview.
                </p>
                <p>
                  Please upgrade to Safari 16.4+ or use Brave/Firefox/Chrome for
                  the best experience.
                </p>
                {isDataValid && resumeData && (
                  <button
                    onClick={() => handleDownload(resumeData)}
                    className={`${resumePreviewStyles.controlButton} ${resumePreviewStyles.downloadButton}`}
                    style={{ marginTop: '1rem' }}
                  >
                    <FiDownload />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ResumePreview resumeData={resumeData} isDataValid={isDataValid} />
        )}
      </div>
    </div>
  )
}
