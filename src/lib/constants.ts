import { Month } from './types/projects'

export const API_BASE_URL = '/api'
export const ROUTES = {
  ANALYZE_JOB_DESCRIPTION: `${API_BASE_URL}/analyze-job-description`,
  GENERATE_BULLETS: `${API_BASE_URL}/generate-bullets`,
  CREATE_PDF: `${API_BASE_URL}/create-pdf`,
}

export const months: { label: Month; num: number }[] = [
  { label: 'Jan', num: 0 },
  { label: 'Feb', num: 1 },
  { label: 'Mar', num: 2 },
  { label: 'Apr', num: 3 },
  { label: 'May', num: 4 },
  { label: 'Jun', num: 5 },
  { label: 'Jul', num: 6 },
  { label: 'Aug', num: 7 },
  { label: 'Sep', num: 8 },
  { label: 'Oct', num: 9 },
  { label: 'Nov', num: 10 },
  { label: 'Dec', num: 11 },
]

// Debounce delays
export const VALIDATION_DELAY = 250
export const TOUCH_DELAY = 300

// Durations
export const DROPPING_ANIMATION_DURATION = 250
