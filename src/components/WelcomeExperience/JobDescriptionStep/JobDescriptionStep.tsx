import styles from './JobDescriptionStep.module.scss'
import { useState } from 'react'
import { z } from 'zod'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { jobDetailsService } from '@/lib/services/jobDetailsService'
import {
  useExperienceStore,
  useJobDetailsStore,
  useProjectStore,
  useSettingsStore,
} from '@/stores'
import { zodErrorsToFormErrors } from '@/lib/types/errors'
import { Section } from '@/lib/types/api'
import { bulletService } from '@/lib/services'
import { v4 as uuidv4 } from 'uuid'
import { ExperienceBlockData } from '@/lib/types/experience'
import { ProjectBlockData } from '@/lib/types/projects'

interface JobDescriptionStepProps {
  onContinue: () => void
}

type ProgressState =
  | 'analyzing'
  | 'extracting-skills'
  | 'generating-bullets'
  | 'success'

const jobDescriptionSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
})

export const JobDescriptionStep: React.FC<JobDescriptionStepProps> = ({
  onContinue,
}) => {
  const { data: jobDetails, hasAnalysis } = useJobDetailsStore()
  const { data: workExperience } = useExperienceStore()
  const { data: projects } = useProjectStore()
  const { data: settings } = useSettingsStore()

  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    jobDetails.originalJobDescription || ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [progressState, setProgressState] = useState<ProgressState | null>(null)

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
            const { save: saveExperience } = useExperienceStore.getState()
            const updatedExperience = workExperience.map((exp) =>
              exp.id === sectionId ? { ...exp, bulletPoints: bullets } : exp
            )
            await saveExperience(updatedExperience)
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

  const handleSkillMatching = async () => {
    // TODO: implement
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasAnalysis) {
      onContinue()
      return
    }

    const validation = jobDescriptionSchema.safeParse({
      jobDescription: jobDescriptionInput,
    })

    if (!validation.success) {
      setErrors(zodErrorsToFormErrors(validation.error))
      return
    }

    try {
      setProgressState('analyzing')
      await handleJobAnalysis(jobDescriptionInput)

      setProgressState('extracting-skills')
      await handleSkillMatching()

      setProgressState('generating-bullets')
      await handlBulletGeneration(workExperience, projects)

      setProgressState('success')
    } catch (error) {
      console.error('Error in job description processing:', error)
      setErrors({
        jobDescription: 'Failed to process job description. Please try again.',
      })
      setProgressState(null)
    }
  }

  const getProgressMessage = (progressState: ProgressState): string => {
    switch (progressState) {
      case 'analyzing':
        return 'Analyzing job description...'
      case 'extracting-skills':
        return 'Extracting skills...'
      case 'generating-bullets':
        return 'Generating customized bullet points...'
      case 'success':
        return 'Success! Your resume preview is ready.'
      default:
        return ''
    }
  }

  const isLoading = progressState !== null && progressState !== 'success'
  const isSuccess = progressState === 'success' || hasAnalysis

  return (
    <form onSubmit={handleSubmit} className={styles.jobDescriptionForm}>
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

      {isLoading && (
        <div className={styles.progressContainer}>
          <LoadingSpinner />
          <p className={styles.progressMessage}>
            {getProgressMessage(progressState)}
          </p>
        </div>
      )}

      {isSuccess && !isLoading && (
        <div className={styles.analysisSuccess}>
          Job description analyzed successfully! Your resume preview is ready.
          Enjoy your time with ResuMint!
        </div>
      )}

      <div className={styles.actionButtons}>
        <button
          type='submit'
          className={styles.continueButton}
          disabled={isLoading}
        >
          {hasAnalysis ? 'Continue' : 'Analyze'}
        </button>
      </div>
    </form>
  )
}
