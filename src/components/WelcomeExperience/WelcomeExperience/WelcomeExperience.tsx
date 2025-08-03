'use client'

import styles from './WelcomeExperience.module.scss'
import { useState, useEffect, JSX } from 'react'
import {
  WelcomeExperienceState,
  shouldShowWelcomeExperience,
} from '@/lib/utils'
import { EducationBlockData } from '@/lib/types/education'
import { JobDetails } from '@/lib/types/jobDetails'
import { STORAGE_KEYS } from '@/lib/constants'
import PersonalDetailsStep from '../PersonalDetailsStep/PersonalDetailsStep'
import { WelcomeStep } from '../WelcomeStep/WelcomeStep'
import { ExperienceProjectsStep } from '../ExperienceProjectsStep/ExperienceProjectsStep'
import { EducationStep } from '../EducationStep/EducationStep'
import { JobDescriptionStep } from '../JobDescriptionStep/JobDescriptionStep'
import {
  usePersonalDetailsStore,
  useExperienceStore,
  useProjectStore,
} from '@/stores'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { ExperienceBlockData } from '@/lib/types/experience'
import { ProjectBlockData } from '@/lib/types/projects'
import { FiStar, FiUser, FiBriefcase, FiBook, FiFileText } from 'react-icons/fi'

interface WelcomeExperienceProps {
  welcomeState: WelcomeExperienceState
  onComplete: () => void
}

interface BaseStepProps {
  onContinue: () => void
  onSkip?: () => void
}

interface WelcomeStep {
  id: number
  title: string
  subtitle: string
  content: string
  isOptional?: boolean
}

interface PersonalizationData {
  firstName: string
  fullName: string
  email: string
  hasExperience: boolean
  hasProjects: boolean
  hasEducation: boolean
  experienceCount: number
  projectCount: number
  educationCount: number
  topSkills: string[]
  hasJobDescription: boolean
}

interface StoredSkills {
  hardSkills: string[]
  softSkills: string[]
}

const WELCOME_STEPS: WelcomeStep[] = [
  {
    id: 0,
    title: 'Welcome to ResuMint',
    subtitle: 'Your AI-powered resume builder',
    content:
      'Create a professional, tailored resume in minutes. Our AI analyzes job descriptions and optimizes your content to help you stand out from the crowd.',
  },
  {
    id: 1,
    title: 'Personal Details',
    subtitle:
      "Hi there, we're thrilled to have you here at ResuMint! Let's get started by telling us a bit about yourself.",
    content:
      "We'll start with your basic information. Just your name and email to get started.",
  },
  {
    id: 2,
    title: 'Experience & Projects',
    subtitle: 'Show your expertise',
    content:
      "Let's add a work experience or personal project to get us started. Don't worry about adding your full employment history, just one thing is fine for now.",
  },
  {
    id: 3,
    title: 'Education',
    subtitle: 'Academic background',
    content:
      "Add your educational background if you'd like to include it on your resume. This step is optional - feel free to proceed to the next step if you'd like to skip it.",
    isOptional: true,
  },
  {
    id: 4,
    title: 'Job Description',
    subtitle: 'What role are you targeting?',
    content:
      "Paste a job description to let our AI optimize your resume for that specific role. We'll analyze the requirements and tailor your content accordingly.",
  },
]

const STEP_ICONS = {
  0: FiStar,
  1: FiUser,
  2: FiBriefcase,
  3: FiBook,
  4: FiFileText,
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({
  welcomeState,
  onComplete,
}) => {
  const { data: personalDetails } = usePersonalDetailsStore()
  const { data: workExperience } = useExperienceStore()
  const { data: projects } = useProjectStore()
  // TODO: add the rest of the data from the stores when implemented

  const [currentStep, setCurrentStep] = useState(welcomeState.startStep)
  const [isClient, setIsClient] = useState(false)
  const [currentWelcomeState, setCurrentWelcomeState] = useState(welcomeState)

  const getPersonalizationData = (params: {
    personalDetails: PersonalDetails
    workExperience: ExperienceBlockData[]
    projects: ProjectBlockData[]
  }): PersonalizationData => {
    const { personalDetails, workExperience, projects } = params
    const defaultData: PersonalizationData = {
      firstName: '',
      fullName: '',
      email: '',
      hasExperience: false,
      hasProjects: false,
      hasEducation: false,
      experienceCount: 0,
      projectCount: 0,
      educationCount: 0,
      topSkills: [],
      hasJobDescription: false,
    }

    if (typeof window === 'undefined') return defaultData

    try {
      if (personalDetails.name?.trim()) {
        defaultData.fullName = personalDetails.name.trim()
        defaultData.firstName = personalDetails.name.trim().split(' ')[0]
      }
      if (personalDetails.email?.trim()) {
        defaultData.email = personalDetails.email.trim()
      }

      if (Array.isArray(workExperience) && workExperience.length > 0) {
        defaultData.hasExperience = true
        defaultData.experienceCount = workExperience.length
      }

      if (Array.isArray(projects) && projects.length > 0) {
        defaultData.hasProjects = true
        defaultData.projectCount = projects.length
      }

      // Education Data (still from localStorage for now)
      const education = localStorage.getItem(STORAGE_KEYS.EDUCATION)
      if (education) {
        const parsedEducation = JSON.parse(education) as EducationBlockData[]
        if (Array.isArray(parsedEducation) && parsedEducation.length > 0) {
          defaultData.hasEducation = true
          defaultData.educationCount = parsedEducation.length
        }
      }

      // Skills Data (still from localStorage for now)
      const skills = localStorage.getItem(STORAGE_KEYS.SKILLS)
      if (skills) {
        const parsedSkills = JSON.parse(skills) as StoredSkills
        if (parsedSkills && typeof parsedSkills === 'object') {
          // Combine all skill categories and get top ones
          const allSkills: string[] = []
          Object.values(parsedSkills).forEach((skillArray: string[]) => {
            if (Array.isArray(skillArray)) {
              allSkills.push(...skillArray)
            }
          })
          defaultData.topSkills = allSkills.slice(0, 5) // Top 5 skills
        }
      }

      const jobDetailsData = localStorage.getItem(STORAGE_KEYS.JOB_DETAILS)
      if (jobDetailsData) {
        try {
          const parsedJobDetails = JSON.parse(jobDetailsData) as JobDetails
          if (parsedJobDetails.originalJobDescription?.trim()) {
            defaultData.hasJobDescription = true
          }
        } catch {
          // Invalid job details, ignore
        }
      }

      return defaultData
    } catch (error) {
      console.error('Error getting personalization data:', error)
      return defaultData
    }
  }

  const getPersonalizedContent = (step: number, data: PersonalizationData) => {
    const { firstName, hasExperience, hasProjects } = data

    const content = {
      title: '',
      subtitle: '',
      content: '',
    }

    switch (step) {
      case 0: // Welcome Screen
        content.title = firstName
          ? `Welcome, ${firstName}!`
          : 'Welcome to ResuMint'
        content.subtitle = firstName
          ? "Let's create your perfect resume in just a few steps"
          : 'Your AI-powered resume builder'
        content.content = firstName
          ? `Hi ${firstName}, we're excited to help you build a resume that stands out. Our AI-powered platform will guide you through each step.`
          : 'Create a professional, tailored resume in minutes. Our AI analyzes job descriptions and optimizes your content to help you stand out from the crowd.'
        break

      case 1: // Personal Details
        content.title = 'Personal Details'
        content.subtitle = firstName
          ? `Hi ${firstName}, we're thrilled to have you here at ResuMint! Let's get started by telling us a bit about yourself.`
          : "Hi there, we're thrilled to have you here at ResuMint! Let's get started by telling us a bit about yourself."
        content.content =
          "We'll start with your basic information. Just your name and email to get started."
        break

      case 2: // Experience & Projects
        content.title = 'Experience & Projects'
        content.subtitle = firstName
          ? `Awesome, ${firstName}! Now let's show off your expertise`
          : 'Show your expertise'
        content.content = firstName
          ? `Let's add a work experience or personal project to get us started. Don't worry about adding your full employment history, just one thing is fine for now.`
          : "Let's add a work experience or personal project to get us started. Don't worry about adding your full employment history, just one thing is fine for now."
        break

      case 3: // Education
        content.title = 'Education'
        content.subtitle =
          hasExperience || hasProjects
            ? 'Academic background'
            : 'Tell us about your education'
        content.content = hasExperience
          ? `Great work on adding your ${
              hasProjects ? 'experience and project' : 'work experience'
            }! Education details help round out your profile. This step is optional - feel free to proceed to the next step if you'd like to skip it.`
          : hasProjects
          ? "Nice work on your project! Adding education details will strengthen your profile. This step is optional - feel free to proceed to the next step if you'd like to skip it."
          : "Add your educational background if you'd like to include it on your resume. This step is optional - feel free to proceed to the next step if you'd like to skip it."
        break

      case 4: // Job Description
        content.title = 'Job Description'
        content.subtitle = firstName
          ? `Almost there, ${firstName}! Let's optimize your resume`
          : 'What role are you targeting?'
        content.content = firstName
          ? `Perfect ${firstName}! Paste a job description and our AI will optimize your resume to match what employers are looking for.`
          : `Paste a job description and our AI will optimize your resume to match what employers are looking for.`
        break

      default:
        // Fallback to original step data
        const originalStep = WELCOME_STEPS.find((s) => s.id === step)
        if (originalStep) {
          content.title = originalStep.title
          content.subtitle = originalStep.subtitle
          content.content = originalStep.content
        }
    }

    return content
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !isStepAccessible(currentStep)) {
      let highestAccessible = 0
      for (let i = WELCOME_STEPS.length - 1; i >= 0; i--) {
        if (isStepAccessible(i)) {
          highestAccessible = i
          break
        }
      }
      setCurrentStep(highestAccessible)
    }
  }, [currentStep, isClient, currentWelcomeState.completedSteps])

  const getPersonalizedStepData = (stepId: number): WelcomeStep => {
    const personalizationData = getPersonalizationData({
      personalDetails,
      workExperience,
      projects,
    })
    const personalizedContent = getPersonalizedContent(
      stepId,
      personalizationData
    )
    const originalStep =
      WELCOME_STEPS.find((step) => step.id === stepId) || WELCOME_STEPS[0]

    return {
      ...originalStep,
      title: personalizedContent.title || originalStep.title,
      subtitle: personalizedContent.subtitle || originalStep.subtitle,
      content: personalizedContent.content || originalStep.content,
    }
  }

  const getNextIncompleteStep = (
    fromStep: number,
    welcomeState?: WelcomeExperienceState
  ): number => {
    const stateToUse = welcomeState || currentWelcomeState

    for (let i = fromStep; i <= WELCOME_STEPS.length; i++) {
      if (!stateToUse.completedSteps.includes(i)) {
        return i
      }
    }

    return WELCOME_STEPS.length
  }

  const isStepAccessible = (
    stepId: number,
    welcomeState?: WelcomeExperienceState
  ): boolean => {
    const stateToUse = welcomeState || currentWelcomeState

    if (stepId <= currentStep) return true

    if (stepId === 0 || stepId === 1) return true

    if (stateToUse.completedSteps.includes(stepId)) {
      return true
    }

    if (stepId >= 2) {
      if (!stateToUse.completedSteps.includes(1)) {
        return false
      }
    }

    if (stepId === 4) {
      return stateToUse.completedSteps.includes(2)
    }

    if (stepId === 3) {
      return stateToUse.completedSteps.includes(2)
    }

    return true
  }

  const handleStepClick = (stepId: number): void => {
    if (stepId <= currentStep) {
      setCurrentStep(stepId)
      return
    }

    if (isStepAccessible(stepId)) {
      setCurrentStep(stepId)
    }
  }

  const handleStepContinue = (stepId: number): void => {
    const newWelcomeState = shouldShowWelcomeExperience()
    setCurrentWelcomeState(newWelcomeState)

    if (stepId === 0) {
      setCurrentStep(1)
      return
    }

    const nextStep = getNextIncompleteStep(stepId + 1, newWelcomeState)

    if (
      nextStep >= WELCOME_STEPS.length ||
      !isStepAccessible(nextStep, newWelcomeState)
    ) {
      onComplete()
      return
    }

    setCurrentStep(nextStep)
  }

  const getStepProps = (stepId: number): BaseStepProps => {
    const stepData = getPersonalizedStepData(stepId)

    return {
      onContinue: () => handleStepContinue(currentStep),
      onSkip: stepData.isOptional
        ? () => handleStepContinue(currentStep)
        : undefined,
    }
  }

  const renderStepContent = (): JSX.Element | null => {
    if (!isClient) return null

    const stepProps = getStepProps(currentStep)

    switch (currentStep) {
      case 0:
        return <WelcomeStep onContinue={stepProps.onContinue} />

      case 1:
        return <PersonalDetailsStep onContinue={stepProps.onContinue} />

      case 2:
        return <ExperienceProjectsStep onContinue={stepProps.onContinue} />

      case 3:
        return (
          <EducationStep
            onContinue={stepProps.onContinue}
            onSkip={stepProps.onSkip}
          />
        )

      case 4:
        return <JobDescriptionStep onContinue={stepProps.onContinue} />

      default:
        return null
    }
  }

  const currentStepData = getPersonalizedStepData(currentStep)

  return (
    <div className={styles.welcomeWrapper}>
      <div className={styles.welcomeContainer}>
        <div className={styles.header}>
          {currentStep > 0 && (
            <div className={styles.stepIndicator}>
              Step {currentStep} of {WELCOME_STEPS.length - 1}
              {currentStepData.isOptional && (
                <span className={styles.optionalBadge}>Optional</span>
              )}
            </div>
          )}
          <h1 className={styles.title}>{currentStepData.title}</h1>
          <p className={styles.subtitle}>{currentStepData.subtitle}</p>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>{currentStepData.content}</p>
          {renderStepContent()}
        </div>

        <div className={styles.progressIndicator}>
          {WELCOME_STEPS.map((step, index) => {
            const isCurrentStep = step.id === currentStep
            const isPreviousStep = step.id < currentStep
            const isAccessibleForward =
              step.id > currentStep && isStepAccessible(step.id)
            const isCompleted = currentWelcomeState.completedSteps.includes(
              step.id
            )
            const isClickable =
              isPreviousStep || isCurrentStep || isAccessibleForward
            const IconComponent = STEP_ICONS[step.id as keyof typeof STEP_ICONS]
            const isLastStep = index === WELCOME_STEPS.length - 1

            const nextStep = WELCOME_STEPS[index + 1]
            const isNextStepCompleted = nextStep
              ? currentWelcomeState.completedSteps.includes(nextStep.id)
              : false
            const shouldConnectorBeCompleted =
              isCompleted && isNextStepCompleted

            return (
              <div key={step.id} className={styles.progressStep}>
                <button
                  className={`${styles.stepButton} ${
                    isCurrentStep ? styles.current : ''
                  } ${isClickable ? styles.accessible : ''} ${
                    isCompleted ? styles.completed : ''
                  }`}
                  onClick={() => handleStepClick(step.id)}
                  title={
                    !isClickable && step.id > currentStep
                      ? 'Complete previous steps to unlock'
                      : isCompleted
                      ? `${step.title} - Completed`
                      : step.title
                  }
                  disabled={!isClickable}
                >
                  <IconComponent />
                </button>
                {!isLastStep && (
                  <div
                    className={`${styles.stepConnector} ${
                      shouldConnectorBeCompleted ? styles.completed : ''
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
