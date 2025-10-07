export const LanguageModel = {
  GPT_35_TURBO: 'gpt-3.5-turbo',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_41_MINI: 'gpt-4.1-mini',
} as const

export type LanguageModel = (typeof LanguageModel)[keyof typeof LanguageModel]

export const ResumeSection = {
  EXPERIENCE: 'experience',
  PROJECTS: 'projects',
  EDUCATION: 'education',
  SKILLS: 'skills',
} as const

export type ResumeSection = (typeof ResumeSection)[keyof typeof ResumeSection]

export interface RawSettings {
  id: string
  bullets_per_experience_block: number
  bullets_per_project_block: number
  max_chars_per_bullet: number
  language_model: LanguageModel
  section_order: ResumeSection[]
  updated_at?: string
  created_at?: string
}

export interface AppSettings {
  id: string
  bulletsPerExperienceBlock: number
  bulletsPerProjectBlock: number
  maxCharsPerBullet: number
  languageModel: LanguageModel
  sectionOrder: ResumeSection[]
  updatedAt?: string
}

export const SettingsFields = {
  BULLETS_PER_EXPERIENCE_BLOCK: 'bulletsPerExperienceBlock',
  BULLETS_PER_PROJECT_BLOCK: 'bulletsPerProjectBlock',
  MAX_CHARS_PER_BULLET: 'maxCharsPerBullet',
  LANGUAGE_MODEL: 'languageModel',
}

export interface SettingsFormState {
  errors: Record<string, string>
  data?: AppSettings
}
