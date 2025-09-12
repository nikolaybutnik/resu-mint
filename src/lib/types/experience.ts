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
  start_month: string | null
  start_year: number | null
  end_month: string | null
  end_year: number | null
  is_present: boolean | null
  is_included: boolean | null
  position: number | null
  updatedAt: string | null
  createdAt: string | null
}

export interface ExperienceFormState {
  fieldErrors: Record<string, string>
  data?: ExperienceBlockData
  notifications?: ToastMessage[]
}
