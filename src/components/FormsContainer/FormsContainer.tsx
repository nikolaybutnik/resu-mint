'use client'

import styles from './FormsContainer.module.scss'
import resumePreviewStyles from '@/components/ResumePreview/ResumePreview.module.scss'
import { useState, useEffect, useMemo, useRef } from 'react'
import { ExperienceBlockData } from '@/lib/types/experience'
import ResumePreview from '@/components/ResumePreview/ResumePreview'
import PersonalDetails from '@/components/PersonalDetails/PersonalDetails'
import WorkExperience from '../Experience/WorkExperience/WorkExperience'
import Education from '../Education/Education/Education'
import Settings from '../Settings/Settings'
import { JobDetails } from '../JobDescription/JobDescription'
import Projects from '../Projects/Projects/Projects'
import Skills from '../Skills/Skills'
import { MOBILE_VIEW, ROUTES } from '@/lib/constants'
import { ProjectBlockData } from '@/lib/types/projects'
import { CreatePdfRequest } from '@/lib/types/api'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { EducationBlockData } from '@/lib/types/education'
import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'
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
import {
  useExperienceStore,
  useJobDetailsStore,
  usePersonalDetailsStore,
  useProjectStore,
  useEducationStore,
} from '@/stores'

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

// TODO: move to hook
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
  const sidebarRef = useRef<HTMLDivElement>(null)
  const tabNavRef = useRef<HTMLDivElement>(null)

  // Stores
  const { data: personalDetails } = usePersonalDetailsStore()
  const { data: workExperience } = useExperienceStore()
  const { data: projects } = useProjectStore()
  const { data: education } = useEducationStore()
  const { data: jobDetails } = useJobDetailsStore()

  // UI States
  const [activeTab, setActiveTab] = useState<string>(Tabs.JOB_DETAILS)
  const [isClient, setIsClient] = useState(false)
  const [safariUnsupported, setSafariUnsupported] = useState(false)
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setSafariUnsupported(isUnsupportedSafari())
  }, [])

  // TODO: keywords will go into store
  // TODO: now that we have access to the skills which maytch the user's experience,
  // these skills will need to be prioritized.
  const keywordData = useKeywordAnalysis(
    workExperience,
    projects,
    jobDetails.analysis
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

  const resumeData = useMemo(() => {
    return buildResumeData(personalDetails, workExperience, projects, education)
  }, [personalDetails, workExperience, projects, education])

  const isDataValid = useMemo(() => {
    if (!resumeData) return false

    return isResumeDataValid(
      personalDetails,
      workExperience,
      projects,
      education,
      jobDetails.originalJobDescription,
      jobDetails.analysis
    )
  }, [
    personalDetails,
    workExperience,
    projects,
    education,
    resumeData,
    jobDetails.originalJobDescription,
    jobDetails.analysis,
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
          {activeTab === Tabs.JOB_DETAILS && <JobDetails />}
          {activeTab === Tabs.PERSONAL_DETAILS && <PersonalDetails />}
          {activeTab === Tabs.EXPERIENCE && (
            <WorkExperience keywordData={keywordData} />
          )}
          {activeTab === Tabs.PROJECTS && (
            <Projects keywordData={keywordData} />
          )}
          {activeTab === Tabs.EDUCATION && <Education />}
          {activeTab === Tabs.SKILLS && <Skills />}
          {activeTab === Tabs.SETTINGS && <Settings />}
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
