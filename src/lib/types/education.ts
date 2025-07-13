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
}

export interface EducationFormState {
  errors: Record<string, string>
  data?: Partial<EducationBlockData>
}
