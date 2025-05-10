import styles from './JobDescription.module.scss'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'
import { useDebouncedCallback } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface JobDescriptionProps {
  data: string
  loading: boolean
  onSave: (data: string) => void
}

export const JobDescription: React.FC<JobDescriptionProps> = ({
  data,
  loading,
  onSave,
}) => {
  const [localData, setLocalData] = useState(data)

  const debouncedOnSave = useDebouncedCallback(onSave, 300)

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
        <LoadingSpinner text='Loading the job description...' size='lg' />
      ) : (
        <div className={styles.jobDescription}>
          <h2 className={styles.formTitle}>Job Description</h2>
          <textarea
            className={styles.formTextarea}
            placeholder='This one is simple. Just paste the entire job description here. Formatting doesn’t matter. Your resume will be generates to align with the exact description of the job.'
            value={localData}
            onChange={handleChange}
          />
        </div>
      )}
    </>
  )
}
