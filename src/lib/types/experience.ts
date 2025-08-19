import { ToastMessage } from './toast'

export type Month =
  | 'Jan'
  | 'Feb'
  | 'Mar'
  | 'Apr'
  | 'May'
  | 'Jun'
  | 'Jul'
  | 'Aug'
  | 'Sep'
  | 'Oct'
  | 'Nov'
  | 'Dec'

export interface BulletPoint {
  id: string
  text: string
  isLocked?: boolean
  isTemporary?: boolean
  position?: number
}

export type StartDate = {
  month?: Month | ''
  year: string
}

export type EndDate = {
  month?: Month | ''
  year: string
  isPresent: boolean
}

export interface ExperienceBlockData {
  id: string
  title: string
  startDate: StartDate
  endDate: EndDate
  companyName: string
  location: string
  description?: string
  bulletPoints: BulletPoint[]
  isIncluded: boolean
  position?: number
  updatedAt?: string
}

export interface RawExperienceData {
  id: string
  title: string
  company_name: string
  location: string
  description: string | null
  start_year: number | null
  start_month: string | null
  is_present: boolean | null
  end_year: number | null
  end_month: string | null
  is_included: boolean | null
  position: number | null
  updated_at: string | null
}

export interface ExperienceFormState {
  fieldErrors: Record<string, string>
  data?: ExperienceBlockData
  notifications?: ToastMessage[]
}
