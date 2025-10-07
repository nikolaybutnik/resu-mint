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

export interface RawProjectBulletData {
  id: string
  project_id: string
  text: string
  is_locked: boolean
  position: number
  updated_at: string
  created_at: string
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
  description: string
  startDate: StartDate
  endDate: EndDate
  bulletPoints?: BulletPoint[]
  link: string
  isIncluded?: boolean
  position?: number
  updatedAt?: string
}

export interface RawProjectData {
  id: string
  title: string
  link: string | null
  technologies: string[]
  description: string | null
  start_month: string | null
  start_year: number | null
  end_month: string | null
  end_year: number | null
  is_present: boolean | null
  is_included: boolean | null
  position: number | null
  updated_at: string | null
  created_at: string | null
  // Aggregated bullet points from SQL JSON_AGG
  bullet_points?: BulletPoint[]
}

export interface ProjectFormState {
  fieldErrors: Record<string, string>
  data?: ProjectBlockData
}
