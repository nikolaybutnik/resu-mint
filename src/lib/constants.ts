import { Month } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'

export const API_BASE_URL = 'http://localhost:3000/api'
export const ROUTES = {
  MINT_RESUME: `${API_BASE_URL}/mint-resume`,
  ANALYZE_JOB_DESCRIPTION: `${API_BASE_URL}/analyze-job-description`,
}

export const months: Month[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
