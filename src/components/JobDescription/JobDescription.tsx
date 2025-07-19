import styles from './JobDescription.module.scss'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { useDebouncedCallback } from '@/lib/clientUtils'
import { useEffect, useRef, useState } from 'react'
import { useMobile } from '@/lib/hooks'
import { FiChevronUp, FiChevronDown } from 'react-icons/fi'
import { useJobDetailsStore } from '@/stores'
import { jobDetailsService } from '@/lib/services/jobDetailsService'

export const JobDetails: React.FC = () => {
  const { data: jobDetails, analyzing } = useJobDetailsStore()
  const isMobile = useMobile()

  const prevJobDescription = useRef(jobDetails.originalJobDescription)
  const isContentSelected = useRef(false)

  const [expandedSummary, setExpandedSummary] = useState(false)
  const [expandedCompanyDesc, setExpandedCompanyDesc] = useState(false)
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false)
  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    jobDetails.originalJobDescription
  )

  // This useEffect syncs the textarea with the store data when it loads to prevent false triggers of the job analysis endpoint
  useEffect(() => {
    if (
      jobDetails.originalJobDescription &&
      jobDetails.originalJobDescription !== jobDescriptionInput
    ) {
      setJobDescriptionInput(jobDetails.originalJobDescription)
    }
  }, [jobDetails.originalJobDescription])

  useEffect(() => {
    if (
      !jobDetails.originalJobDescription ||
      jobDetails.originalJobDescription.trim() === '' ||
      prevJobDescription.current === jobDetails.originalJobDescription ||
      !!jobDetails.analysis?.jobTitle ||
      analyzing
    ) {
      return
    }

    const analyzeJobDescription = async (jobDescription: string) => {
      try {
        await jobDetailsService.analyzeJobDescription(jobDescription)
      } catch (error) {
        console.error('Analysis failed:', error)
      }
    }

    analyzeJobDescription(jobDetails.originalJobDescription)
    prevJobDescription.current = jobDetails.originalJobDescription
  }, [jobDetails.originalJobDescription, jobDetails.analysis, analyzing])

  const saveJobDescription = async (data: string) => {
    await jobDetailsService.saveJobDescription(data)
  }

  const debouncedSave = useDebouncedCallback(saveJobDescription, 2000)

  const handleJobDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setJobDescriptionInput(e.target.value)
    debouncedSave(e.target.value)
  }

  return (
    <div className={styles.jobDescription}>
      <h2 className={styles.formTitle}>Job Details</h2>

      <div className={styles.jobDescriptionContainer}>
        <div className={styles.textareaWrapper}>
          <textarea
            className={`${styles.formTextarea} ${
              isMobile && isTextareaExpanded ? styles.expanded : ''
            }`}
            placeholder='Paste the entire job description here and wait for analysis to complete. When you start building your resume, it will be aligned with the job description.'
            value={jobDescriptionInput}
            onChange={handleJobDescriptionChange}
            disabled={analyzing}
            onFocus={(e) => {
              if (!isContentSelected.current) {
                e.target.select()
                isContentSelected.current = true
              }
            }}
            onClick={(e) => {
              if (!isContentSelected.current) {
                e.currentTarget.select()
                isContentSelected.current = true
              }
            }}
            onBlur={() => {
              isContentSelected.current = false
            }}
          />
          {isMobile && (
            <button
              className={styles.expandButton}
              onClick={() => setIsTextareaExpanded(!isTextareaExpanded)}
              type='button'
            >
              {isTextareaExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          )}
        </div>

        {analyzing ? (
          <LoadingSpinner text='Analyzing the job description...' size='lg' />
        ) : (
          <>
            <div className={styles.jobDescriptionAnalysis}>
              <h3 className={styles.analysisTitle}>Job Analysis</h3>

              {jobDetails.analysis?.jobTitle && (
                <div className={styles.jobTitleSection}>
                  <h4 className={styles.jobTitleHeading}>
                    {jobDetails.analysis?.jobTitle}
                  </h4>
                  <div className={styles.workType}>
                    {jobDetails.analysis?.location?.type && (
                      <span
                        className={`${styles.workTypeBadge} ${
                          styles[jobDetails.analysis?.location.type]
                        }`}
                      >
                        {jobDetails.analysis?.location.type}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {jobDetails.analysis?.specialInstructions && (
                <div className={styles.specialInstructionsSection}>
                  <div className={styles.specialInstructionsLabel}>
                    Important Application Instructions
                  </div>
                  <p className={styles.specialInstructionsText}>
                    {jobDetails.analysis?.specialInstructions}
                  </p>
                </div>
              )}

              <div className={styles.analysisGrid}>
                <div className={styles.analysisItem}>
                  <h4 className={styles.analysisLabel}>Job Summary</h4>
                  <div
                    className={`${styles.summaryContainer} ${
                      expandedSummary ? styles.expanded : ''
                    }`}
                  >
                    <p className={styles.analysisText}>
                      {jobDetails.analysis?.jobSummary ||
                        'No summary available'}
                    </p>
                    {!expandedSummary && jobDetails.analysis?.jobSummary && (
                      <div className={styles.fadeOverlay}></div>
                    )}
                  </div>
                  {jobDetails.analysis?.jobSummary && (
                    <div className={styles.expandButtonContainer}>
                      <button
                        className={styles.contentExpandButton}
                        onClick={() => setExpandedSummary(!expandedSummary)}
                      >
                        {expandedSummary ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.analysisItem}>
                  <h4 className={styles.analysisLabel}>Hard Skills</h4>
                  <div className={styles.skillsList}>
                    {jobDetails.analysis?.skillsRequired?.hard?.length ? (
                      jobDetails.analysis?.skillsRequired.hard.map(
                        (skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        )
                      )
                    ) : (
                      <p className={styles.emptyState}>
                        No hard skills identified
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.analysisItem}>
                  <h4 className={styles.analysisLabel}>Soft Skills</h4>
                  <div className={styles.skillsList}>
                    {jobDetails.analysis?.skillsRequired?.soft?.length ? (
                      jobDetails.analysis?.skillsRequired.soft.map(
                        (skill, index) => (
                          <span key={index} className={styles.skillTag}>
                            {skill}
                          </span>
                        )
                      )
                    ) : (
                      <p className={styles.emptyState}>
                        No soft skills identified
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.analysisItem}>
                  <h4 className={styles.analysisLabel}>Contextual Skills</h4>
                  <div className={styles.skillsList}>
                    {jobDetails.analysis?.contextualSkills?.length ? (
                      jobDetails.analysis?.contextualSkills.map(
                        (tech, index) => (
                          <span key={index} className={styles.skillTag}>
                            {tech}
                          </span>
                        )
                      )
                    ) : (
                      <p className={styles.emptyState}>
                        No technologies identified
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.analysisItem}>
                  <h4 className={styles.analysisLabel}>Company Information</h4>
                  <div className={styles.companyInfo}>
                    <p>
                      <strong>Name: </strong>
                      {jobDetails.analysis?.companyName || 'Unknown'}
                    </p>
                    <p>
                      <strong>Location: </strong>
                      {jobDetails.analysis?.location?.listedLocation ||
                        'Not specified'}
                      {jobDetails.analysis?.location?.details && (
                        <span className={styles.locationDetails}>
                          <br />
                          <small>{jobDetails.analysis?.location.details}</small>
                        </span>
                      )}
                    </p>
                    <p>
                      <strong>Salary Range:</strong>{' '}
                      {jobDetails.analysis?.salaryRange ? (
                        jobDetails.analysis?.salaryRange
                      ) : (
                        <span className={styles.emptyState}>Not specified</span>
                      )}
                    </p>
                  </div>
                  <div
                    className={`${styles.summaryContainer} ${
                      expandedCompanyDesc ? styles.expanded : ''
                    }`}
                  >
                    <p className={styles.analysisText}>
                      {jobDetails.analysis?.companyDescription ||
                        'No company description available'}
                    </p>
                    {!expandedCompanyDesc &&
                      jobDetails.analysis?.companyDescription && (
                        <div className={styles.fadeOverlay}></div>
                      )}
                  </div>
                  {jobDetails.analysis?.companyDescription && (
                    <div className={styles.expandButtonContainer}>
                      <button
                        className={styles.contentExpandButton}
                        onClick={() =>
                          setExpandedCompanyDesc(!expandedCompanyDesc)
                        }
                      >
                        {expandedCompanyDesc ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
