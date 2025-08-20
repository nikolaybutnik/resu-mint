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

export interface ProjectBlockData {
  id: string
  title: string
  technologies: string[]
  description?: string
  startDate: StartDate
  endDate: EndDate
  bulletPoints: BulletPoint[]
  link: string
  isIncluded: boolean
  updatedAt?: string
}

export interface ProjectFormState {
  fieldErrors: Record<string, string>
  data?: ProjectBlockData
}
