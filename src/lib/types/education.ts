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

export type StartDate = {
  month?: Month | ''
  year: string
}

export type EndDate = {
  month?: Month | ''
  year: string
}

export const DegreeStatus = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in-progress',
} as const

export type DegreeStatus = (typeof DegreeStatus)[keyof typeof DegreeStatus] | ''

export interface EducationBlockData {
  id: string
  institution: string
  degree: string // "Bachelor of Science in Computer Science"
  degreeStatus?: DegreeStatus
  startDate?: StartDate
  endDate?: EndDate
  location?: string
  description?: string
  isIncluded?: boolean
  position?: number
  updatedAt?: string
}

export interface RawEducationData {
  id: string
  institution: string
  degree: string
  degree_status: string | null
  location: string | null
  description: string | null
  start_month: string | null
  start_year: number | null
  end_month: string | null
  end_year: number | null
  is_included: boolean | null
  position: number | null
  updated_at: string | null
  created_at: string | null
}

export interface EducationFormState {
  fieldErrors: Record<string, string>
  data?: Partial<EducationBlockData>
}
