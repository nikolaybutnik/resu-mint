import { useState, useEffect } from 'react'
import { z } from 'zod'
import styles from './JobDescriptionStep.module.scss'
import { STORAGE_KEYS } from '@/lib/constants'
import { JobDescriptionAnalysis } from '@/lib/types/api'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'

interface JobDescriptionStepProps {
  onContinue: () => void
}

const jobDescriptionSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
})

type JobDescriptionFormData = z.infer<typeof jobDescriptionSchema>

export const JobDescriptionStep: React.FC<JobDescriptionStepProps> = ({
  onContinue,
}) => {
  const [formData, setFormData] = useState<JobDescriptionFormData>({
    jobDescription: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAnalysis, setHasAnalysis] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load existing data on mount
  useEffect(() => {
    if (isClient) {
      try {
        const existingJobDescription = localStorage.getItem(
          STORAGE_KEYS.JOB_DESCRIPTION
        )
        const existingAnalysis = localStorage.getItem(
          STORAGE_KEYS.JOB_DESCRIPTION_ANALYSIS
        )

        if (existingJobDescription) {
          setFormData({
            jobDescription: existingJobDescription,
          })
        }

        if (existingAnalysis) {
          try {
            JSON.parse(existingAnalysis)
            setHasAnalysis(true)
          } catch {
            // Invalid analysis data, ignore
          }
        }
      } catch (error) {
        console.error('Error loading job description data:', error)
      }
    }
  }, [isClient])

  const handleInputChange = (field: keyof JobDescriptionFormData) => {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setFormData((prev) => ({ ...prev, [field]: value }))

      // Clear errors when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }))
      }

      // Reset analysis state when job description changes
      if (field === 'jobDescription' && hasAnalysis) {
        setHasAnalysis(false)
        localStorage.removeItem(STORAGE_KEYS.JOB_DESCRIPTION_ANALYSIS)
      }
    }
  }

  const analyzeJobDescription = async (jobDescription: string) => {
    setIsAnalyzing(true)
    setErrors({})

    try {
      const response = await fetch('/api/analyze-job-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          jobDescription,
          settings: {
            bulletsPerExperienceBlock: 3,
            bulletsPerProjectBlock: 3,
            maxCharsPerBullet: 200,
            languageModel: 'gpt-4o-mini',
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze job description')
      }

      const responseData = await response.json()

      const analysis: JobDescriptionAnalysis = responseData.data || responseData

      // Save analysis to localStorage
      localStorage.setItem(
        STORAGE_KEYS.JOB_DESCRIPTION_ANALYSIS,
        JSON.stringify(analysis)
      )
      setHasAnalysis(true)
    } catch (error) {
      console.error('Error analyzing job description:', error)
      setErrors({
        jobDescription: 'Failed to analyze job description. Please try again.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    const validation = jobDescriptionSchema.safeParse(formData)
    if (!validation.success) {
      const newErrors: Record<string, string> = {}
      validation.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          newErrors[error.path[0] as string] = error.message
        }
      })
      setErrors(newErrors)
      return
    }

    try {
      // Save job description to localStorage
      localStorage.setItem(
        STORAGE_KEYS.JOB_DESCRIPTION,
        formData.jobDescription
      )

      // Analyze job description if not already analyzed
      if (!hasAnalysis) {
        await analyzeJobDescription(formData.jobDescription)
      }

      // Continue to next step
      onContinue()
    } catch (error) {
      console.error('Error submitting job description:', error)
      setErrors({
        jobDescription: 'Failed to save job description. Please try again.',
      })
    }
  }

  const handleAnalyzeOnly = async () => {
    // Validate form data first
    const validation = jobDescriptionSchema.safeParse(formData)
    if (!validation.success) {
      const newErrors: Record<string, string> = {}
      validation.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          newErrors[error.path[0] as string] = error.message
        }
      })
      setErrors(newErrors)
      return
    }

    // Save job description to localStorage
    localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION, formData.jobDescription)

    // Analyze the job description
    await analyzeJobDescription(formData.jobDescription)
  }

  if (!isClient) {
    return null
  }

  return (
    <div className={styles.stepContent}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Job Description</label>
          <textarea
            className={`${styles.formTextarea} ${
              errors.jobDescription ? styles.error : ''
            }`}
            placeholder='Paste the complete job description here. Our AI will analyze it to optimize your resume for this specific role, identifying key skills, requirements, and company information to help you stand out.'
            value={formData.jobDescription}
            onChange={handleInputChange('jobDescription')}
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
          {!hasAnalysis && formData.jobDescription.trim() && !isAnalyzing && (
            <button
              type='button'
              className={styles.analyzeButton}
              onClick={handleAnalyzeOnly}
            >
              Analyze Job Description
            </button>
          )}

          <button
            type='submit'
            className={styles.continueButton}
            disabled={isAnalyzing}
          >
            {hasAnalysis ? 'Continue' : 'Analyze & Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
