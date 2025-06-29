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
}

export interface ExperienceFormState {
  errors: Record<string, string>
  data?: ExperienceBlockData
}
