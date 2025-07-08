import styles from './JobDescriptionStep.module.scss'
import { useState } from 'react'
import { z } from 'zod'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { jobDetailsService } from '@/lib/services/jobDetailsService'
import { useJobDetailsStore } from '@/stores'
import { zodErrorsToFormErrors } from '@/lib/types/errors'

interface JobDescriptionStepProps {
  onContinue: () => void
  onStepComplete?: () => void
}

const jobDescriptionSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
})

export const JobDescriptionStep: React.FC<JobDescriptionStepProps> = ({
  onContinue,
  onStepComplete,
}) => {
  const { data: jobDetails, hasAnalysis } = useJobDetailsStore()

  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    jobDetails.originalJobDescription || ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJobDescriptionInput(value)

    if (errors.jobDescription) {
      setErrors((prev) => ({ ...prev, jobDescription: '' }))
    }
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
      setIsAnalyzing(true)
      await jobDetailsService.saveJobDescription(jobDescriptionInput)
      await jobDetailsService.analyzeJobDescription(jobDescriptionInput)
      onStepComplete?.()
    } catch (error) {
      console.error('Error analyzing job description:', error)
      setErrors({
        jobDescription: 'Failed to analyze job description. Please try again.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Job Description</label>
        <textarea
          className={`${styles.formTextarea} ${
            errors.jobDescription ? styles.error : ''
          }`}
          placeholder='Paste the complete job description here. Our AI will analyze it to optimize your resume for this specific role, identifying key skills, requirements, and company information to help you stand out.'
          value={jobDescriptionInput}
          onChange={handleInputChange}
          disabled={isAnalyzing}
          rows={8}
        />
        {errors.jobDescription && (
          <div className={styles.errorMessage}>{errors.jobDescription}</div>
        )}
      </div>

      {isAnalyzing && (
        <div className={styles.analyzingContainer}>
          <LoadingSpinner text='Analyzing job description...' size='md' />
        </div>
      )}

      {hasAnalysis && !isAnalyzing && (
        <div className={styles.analysisSuccess}>
          ✅ Job description analyzed successfully! Your resume will be
          optimized for this role.
        </div>
      )}

      <div className={styles.actionButtons}>
        <button
          type='submit'
          className={styles.continueButton}
          disabled={isAnalyzing}
        >
          {hasAnalysis ? 'Continue' : 'Analyze'}
        </button>
      </div>
    </form>
  )
}
