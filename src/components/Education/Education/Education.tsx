import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner'
import { JobDescriptionAnalysis } from '@/lib/types/api'
import { EducationBlockData } from '@/lib/types/education'
import { AppSettings } from '@/lib/types/settings'

interface EducationProps {
  data: EducationBlockData[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  settings: AppSettings
  loading: boolean
  onSave: (data: EducationBlockData[]) => void
}

const Education = ({
  data,
  jobDescriptionAnalysis,
  settings,
  loading,
  onSave,
}: EducationProps) => {
  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your education...' size='lg' />
      ) : (
        <div></div>
      )}
    </>
  )
}

export default Education
