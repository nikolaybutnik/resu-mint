import styles from './JobDescriptionStep.module.scss'
import { useState, useEffect, useRef } from 'react'
import { jobDetailsService } from '@/lib/services/jobDetailsService'
import {
  useExperienceStore,
  useJobDetailsStore,
  useProjectStore,
  useSettingsStore,
  useSkillsStore,
} from '@/stores'
import { toast } from '@/stores/toastStore'
import { zodErrorsToFormErrors } from '@/lib/types/errors'
import { Section } from '@/lib/types/api'
import { bulletService, skillsService } from '@/lib/services'
import { v4 as uuidv4 } from 'uuid'
import { ExperienceBlockData } from '@/lib/types/experience'
import { ProjectBlockData } from '@/lib/types/projects'
import { analyzeJobDescriptionRequestSchema } from '@/lib/validationSchemas'
import { SkillBlock, Skills } from '@/lib/types/skills'

interface JobDescriptionStepProps {
  onContinue: () => void
}

type ProgressState =
  | 'analyzing'
  | 'extracting-skills'
  | 'categorizing-skills'
  | 'generating-bullets'
  | 'success'

export const JobDescriptionStep: React.FC<JobDescriptionStepProps> = ({
  onContinue,
}) => {
  const { data: jobDetails, hasAnalysis } = useJobDetailsStore()
  const { data: workExperience } = useExperienceStore()
  const { data: projects } = useProjectStore()
  const { save: saveSkills } = useSkillsStore()
  const { data: settings } = useSettingsStore()

  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    jobDetails.originalJobDescription || ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [progressState, setProgressState] = useState<ProgressState | null>(null)
  const [isMessageAnimating, setIsMessageAnimating] = useState(false)
  const [displayMessage, setDisplayMessage] = useState('')
  const [typewriterText, setTypewriterText] = useState('')
  const [isTypewriting, setIsTypewriting] = useState(false)
  const centeredWrapperRef = useRef<HTMLDivElement>(null)
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJobDescriptionInput(value)

    if (errors.jobDescription) {
      setErrors((prev) => ({ ...prev, jobDescription: '' }))
    }
  }

  const handleJobAnalysis = async (jobDescription: string): Promise<void> => {
    await jobDetailsService.saveJobDescription(jobDescription)
    await jobDetailsService.analyzeJobDescription(jobDescription)
  }

  const handlBulletGeneration = async (
    experience: ExperienceBlockData[],
    projects: ProjectBlockData[]
  ): Promise<void> => {
    const initialBulletCount = 4
    const allSections: Section[] = [
      ...experience.map((exp) => ({
        id: exp.id,
        type: 'experience' as const,
        title: exp.title,
        description: exp.description || '',
        existingBullets: [],
        targetBulletIds: Array.from({ length: initialBulletCount }, () =>
          uuidv4()
        ),
      })),
      ...projects.map((proj) => ({
        id: proj.id,
        type: 'project' as const,
        title: proj.title,
        technologies: proj.technologies,
        description: proj.description || '',
        existingBullets: [],
        targetBulletIds: Array.from({ length: initialBulletCount }, () =>
          uuidv4()
        ),
      })),
    ]

    if (allSections.length > 0) {
      const { data: updatedJobDetails } = useJobDetailsStore.getState()

      const result = await bulletService.generateBulletsForSections(
        allSections,
        updatedJobDetails.analysis,
        settings
      )

      if (result.length > 0) {
        for (const { sectionId, bullets } of result) {
          const experienceSection = workExperience.find(
            (exp) => exp.id === sectionId
          )
          if (experienceSection) {
            // TODO: Rework when experienc is migrated to local-first architecture
            // const { save: saveExperience } = useExperienceStore.getState()
            // const updatedExperience = workExperience.map((exp) =>
            //   exp.id === sectionId ? { ...exp, bulletPoints: bullets } : exp
            // )
            // await saveExperience(updatedExperience)
            continue
          }

          const projectSection = projects.find((proj) => proj.id === sectionId)
          if (projectSection) {
            const { save: saveProjects } = useProjectStore.getState()
            const updatedProjects = projects.map((proj) =>
              proj.id === sectionId ? { ...proj, bulletPoints: bullets } : proj
            )
            await saveProjects(updatedProjects)
          }
        }
      }
    }
  }

  const handleSkillExtraction = async (): Promise<void> => {
    const { data: workExperience } = useExperienceStore.getState()
    const { data: projects } = useProjectStore.getState()
    const initSkills = {
      hardSkills: {
        skills: [],
        suggestions: [],
      },
      softSkills: {
        skills: [],
        suggestions: [],
      },
    }

    const result = await skillsService.extractSkills(
      workExperience,
      projects,
      initSkills,
      settings
    )

    const skillsToSave: Skills = {
      hardSkills: {
        skills: result.hardSkills,
        suggestions: [],
      },
      softSkills: {
        skills: result.softSkills,
        suggestions: [],
      },
    }

    await saveSkills(skillsToSave)
  }

  const handleSkillCategorization = async (): Promise<void> => {
    const { data: jobDetails } = useJobDetailsStore.getState()
    const { data: skills, saveResumeSkillsData } = useSkillsStore.getState()

    const result = await skillsService.categorizeSkills(
      jobDetails.analysis,
      skills,
      settings
    )

    if (result.length > 0) {
      const skillBlocks: SkillBlock[] = result.map((item) => ({
        id: uuidv4(),
        title: item.title,
        skills: item.skills,
        isIncluded: true,
      }))

      await saveResumeSkillsData(skillBlocks)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasAnalysis) {
      onContinue()
      return
    }

    const validation = analyzeJobDescriptionRequestSchema.safeParse({
      jobDescription: jobDescriptionInput,
      settings,
    })

    if (!validation.success) {
      setErrors(zodErrorsToFormErrors(validation.error))
      return
    }

    try {
      setProgressState('analyzing')
      await handleJobAnalysis(jobDescriptionInput)

      setProgressState('extracting-skills')
      await handleSkillExtraction()

      setProgressState('categorizing-skills')
      await handleSkillCategorization()

      setProgressState('generating-bullets')
      await handlBulletGeneration(workExperience, projects)

      setProgressState('success')

      setTimeout(() => {
        centeredWrapperRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }, 400)
    } catch (error) {
      console.error('Error in job description processing:', error)

      if (error instanceof Error && error.message === 'INSUFFICIENT_CONTEXT') {
        toast.info(
          'The AI needs more context to generate bullet points. Please add more details to your experience and project descriptions.'
        )
        setProgressState(null)
        return
      }

      setErrors({
        jobDescription: 'Failed to process job description. Please try again.',
      })
      setProgressState(null)
    }
  }

  const progressMessages = {
    analyzing: 'Analyzing job description...',
    'extracting-skills': 'Extracting skills...',
    'categorizing-skills': 'Categorizing skills...',
    'generating-bullets': 'Generating customized bullet points...',
    success:
      'Job description analyzed successfully! Your resume preview is ready. Enjoy your time with ResuMint!',
  } as const

  const typewriterEffect = (text: string) => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current)
    }

    setIsTypewriting(true)
    setTypewriterText('')

    let index = 0
    const type = () => {
      if (index <= text.length) {
        setTypewriterText(text.slice(0, index))
        index++
        typewriterTimeoutRef.current = setTimeout(type, 60)
      } else {
        setIsTypewriting(false)
        typewriterTimeoutRef.current = null
      }
    }

    typewriterTimeoutRef.current = setTimeout(type, 80)
  }

  const progressEmojis = {
    analyzing: '🔍',
    'extracting-skills': '⚡',
    'categorizing-skills': '📊',
    'generating-bullets': '✨',
    success: '🎉',
  } as const

  useEffect(() => {
    if (progressState) {
      const newMessage = progressMessages[progressState] || ''

      if (displayMessage && newMessage !== displayMessage) {
        setIsMessageAnimating(true)

        setTimeout(() => {
          setDisplayMessage(newMessage)
          setIsMessageAnimating(false)
          setTimeout(() => typewriterEffect(newMessage), 100)
        }, 300)
      } else {
        setDisplayMessage(newMessage)
        typewriterEffect(newMessage)
      }
    } else {
      setDisplayMessage('')
      setTypewriterText('')
    }
  }, [progressState, displayMessage])

  useEffect(() => {
    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current)
      }
    }
  }, [])

  const isLoading = progressState !== null && progressState !== 'success'

  return (
    <form
      onSubmit={handleSubmit}
      className={`${styles.jobDescriptionForm} ${
        progressState ? styles.analyzing : ''
      }`}
    >
      <div
        className={`${styles.formSection} ${
          progressState ? styles.fadeOut : ''
        }`}
      >
        <div className={styles.formGroup}>
          <label htmlFor='jobDescription' className={styles.label}>
            Job Description
          </label>
          <textarea
            id='jobDescription'
            name='jobDescription'
            value={jobDescriptionInput}
            onChange={handleInputChange}
            placeholder="Paste the job description and click 'Analyze'. The resulting resume will be tailored to this job description."
            className={styles.textarea}
            disabled={isLoading}
            rows={8}
          />
          {errors.jobDescription && (
            <span className={styles.formError}>{errors.jobDescription}</span>
          )}
        </div>

        {!progressState && !hasAnalysis && (
          <div className={styles.actionButtons}>
            <button type='submit' className={styles.continueButton}>
              Analyze
            </button>
          </div>
        )}
      </div>

      {(progressState || hasAnalysis) && (
        <div ref={centeredWrapperRef} className={styles.centeredWrapper}>
          <div
            className={`${styles.messageContainer} ${
              progressState && progressState !== 'success'
                ? styles.analyzing
                : ''
            }`}
          >
            {progressState && progressState !== 'success' && (
              <div className={styles.analysisIndicator}></div>
            )}

            {progressState && progressState !== 'success' && (
              <div className={styles.statusEmoji}>
                {progressEmojis[progressState] || '⚙️'}
              </div>
            )}

            {(progressState === 'success' ||
              (hasAnalysis && !progressState)) && (
              <div className={styles.successContainer}>
                <div className={styles.successIcon}>
                  <span className={styles.partyEmoji}>🎉</span>
                  <div className={styles.sparkles}>
                    <span className={styles.sparkle}>⭐</span>
                    <span className={styles.sparkle}>✨</span>
                    <span className={styles.sparkle}>✨</span>
                    <span className={styles.sparkle}>✨</span>
                    <span className={styles.sparkle}>💫</span>
                  </div>
                </div>
                <div className={styles.successBadge}>SUCCESS!</div>
                <button
                  onClick={onContinue}
                  className={styles.successContinueButton}
                >
                  Continue to App 🚀
                </button>
              </div>
            )}

            <div
              className={`${styles.messageText} ${
                progressState === 'success' || (hasAnalysis && !progressState)
                  ? styles.successText
                  : isMessageAnimating
                  ? styles.slideOut
                  : styles.slideIn
              }`}
            >
              <span className={styles.textContent}>
                {progressState && progressState !== 'success'
                  ? typewriterText
                  : displayMessage}
              </span>
              {isTypewriting && progressState !== 'success' && (
                <span className={styles.cursor}>|</span>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
