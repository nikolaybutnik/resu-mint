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
  jobTitle: string
  startDate: StartDate
  endDate: EndDate
  companyName: string
  location: string
  description: string
  bulletPoints: BulletPoint[]
}
