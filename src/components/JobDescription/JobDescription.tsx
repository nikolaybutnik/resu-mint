import styles from './JobDescription.module.scss'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'
import { useDebouncedCallback } from '@/lib/clientUtils'
import { useEffect, useState } from 'react'
import { JobDescriptionAnalysis } from '@/lib/types/api'

interface JobDescriptionProps {
  data: string
  loading: boolean
  analyzing: boolean
  onSave: (data: string) => void
  jobDescriptionAnalysis: JobDescriptionAnalysis
}

export const JobDescription: React.FC<JobDescriptionProps> = ({
  data,
  loading,
  analyzing,
  onSave,
  jobDescriptionAnalysis,
}) => {
  const [localData, setLocalData] = useState(data)
  const [expandedSummary, setExpandedSummary] = useState(false)
  const [expandedCompanyDesc, setExpandedCompanyDesc] = useState(false)

  const debouncedOnSave = useDebouncedCallback(onSave, 2000)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalData(e.target.value)
    debouncedOnSave(e.target.value)
  }

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading the job details...' size='lg' />
      ) : (
        <div className={styles.jobDescription}>
          <h2 className={styles.formTitle}>Job Details</h2>
          {analyzing ? (
            <LoadingSpinner text='Analyzing the job description...' size='lg' />
          ) : (
            <div className={styles.jobDescriptionContainer}>
              <div className={styles.textareaWrapper}>
                <textarea
                  className={styles.formTextarea}
                  placeholder='Paste the entire job description here. Formatting doesn’t matter. Wait for the analysis to complete, and your resume will be generated to align with the exact description of the job.'
                  value={localData}
                  onChange={handleChange}
                  disabled={analyzing}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>

              <div className={styles.jobDescriptionAnalysis}>
                <h3 className={styles.analysisTitle}>Job Analysis</h3>

                {jobDescriptionAnalysis.jobTitle && (
                  <div className={styles.jobTitleSection}>
                    <h4 className={styles.jobTitleHeading}>
                      {jobDescriptionAnalysis.jobTitle}
                    </h4>
                    <div className={styles.workType}>
                      {jobDescriptionAnalysis.location?.type && (
                        <span
                          className={`${styles.workTypeBadge} ${
                            styles[jobDescriptionAnalysis.location.type]
                          }`}
                        >
                          {jobDescriptionAnalysis.location.type}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {jobDescriptionAnalysis.specialInstructions && (
                  <div className={styles.specialInstructionsSection}>
                    <div className={styles.specialInstructionsLabel}>
                      Important Application Instructions
                    </div>
                    <p className={styles.specialInstructionsText}>
                      {jobDescriptionAnalysis.specialInstructions}
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
                        {jobDescriptionAnalysis.jobSummary ||
                          'No summary available'}
                      </p>
                      {!expandedSummary &&
                        jobDescriptionAnalysis.jobSummary && (
                          <div className={styles.fadeOverlay}></div>
                        )}
                    </div>
                    {jobDescriptionAnalysis.jobSummary && (
                      <button
                        className={styles.expandButton}
                        onClick={() => setExpandedSummary(!expandedSummary)}
                      >
                        {expandedSummary ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>

                  <div className={styles.analysisItem}>
                    <h4 className={styles.analysisLabel}>Hard Skills</h4>
                    <div className={styles.skillsList}>
                      {jobDescriptionAnalysis.skillsRequired?.hard?.length ? (
                        jobDescriptionAnalysis.skillsRequired.hard.map(
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
                      {jobDescriptionAnalysis.skillsRequired?.soft?.length ? (
                        jobDescriptionAnalysis.skillsRequired.soft.map(
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
                    <h4 className={styles.analysisLabel}>
                      Contextual Technologies
                    </h4>
                    <div className={styles.skillsList}>
                      {jobDescriptionAnalysis.contextualTechnologies?.length ? (
                        jobDescriptionAnalysis.contextualTechnologies.map(
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
                    <h4 className={styles.analysisLabel}>
                      Company Information
                    </h4>
                    <div className={styles.companyInfo}>
                      <p>
                        <strong>Name:</strong>
                        {jobDescriptionAnalysis.companyName || 'Unknown'}
                      </p>
                      <p>
                        <strong>Location:</strong>
                        {jobDescriptionAnalysis.location?.listedLocation ||
                          'Not specified'}
                        {jobDescriptionAnalysis.location?.details && (
                          <span className={styles.locationDetails}>
                            <br />
                            <small>
                              {jobDescriptionAnalysis.location.details}
                            </small>
                          </span>
                        )}
                      </p>
                      <p>
                        <strong>Salary Range:</strong>{' '}
                        {jobDescriptionAnalysis.salaryRange ? (
                          jobDescriptionAnalysis.salaryRange
                        ) : (
                          <span className={styles.emptyState}>
                            Not specified
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className={`${styles.summaryContainer} ${
                        expandedCompanyDesc ? styles.expanded : ''
                      }`}
                    >
                      <p className={styles.analysisText}>
                        {jobDescriptionAnalysis.companyDescription ||
                          'No company description available'}
                      </p>
                      {!expandedCompanyDesc &&
                        jobDescriptionAnalysis.companyDescription && (
                          <div className={styles.fadeOverlay}></div>
                        )}
                    </div>
                    {jobDescriptionAnalysis.companyDescription && (
                      <button
                        className={styles.expandButton}
                        onClick={() =>
                          setExpandedCompanyDesc(!expandedCompanyDesc)
                        }
                      >
                        {expandedCompanyDesc ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
