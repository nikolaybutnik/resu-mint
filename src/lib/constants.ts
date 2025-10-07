import { Month, ProjectBlockData } from './types/projects'
import { PersonalDetails } from './types/personalDetails'
import { ExperienceBlockData } from './types/experience'
import { EducationBlockData } from './types/education'
import { AppSettings, LanguageModel, ResumeSection } from './types/settings'
import { JobDescriptionAnalysis } from './types/jobDetails'
import { JobDetails } from './types/jobDetails'
import { SkillBlock, Skills } from './types/skills'

// ROUTING
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',
  ADMIN: {
    BASE: '/admin',
    DASHBOARD: '/admin/dashboard',
  },
}

// API
export const API_BASE_URL = '/api'
export const API_ROUTES = {
  ANALYZE_JOB_DESCRIPTION: `${API_BASE_URL}/analyze-job-description`,
  GENERATE_BULLETS: `${API_BASE_URL}/generate-bullets`,
  CREATE_PDF: `${API_BASE_URL}/create-pdf`,
  EXTRACT_USER_SKILLS: `${API_BASE_URL}/extract-user-skills`,
  CATEGORIZE_USER_SKILLS: `${API_BASE_URL}/categorize-user-skills`,
  GENERATE_SKILL_SUGGESTIONS: `${API_BASE_URL}/generate-skill-suggestions`,
  TECTONIC_HEALTH: `${API_BASE_URL}/tectonic-health`,
  SHAPE_PROXY: `${API_BASE_URL}/shape-proxy`,
} as const

// General
export const MONTHS: { label: Month; num: number }[] = [
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

export const MOBILE_VIEW = {
  INPUT: 'input',
  PREVIEW: 'preview',
} as const

export const LIVE_PREVIEW = {
  DEBOUNCE_MS: 1500, // Wait 1.5s before generating
  CACHE_DURATION: 10 * 60 * 1000, // Memory cache for 10 minutes
  LOCALSTORAGE_DURATION: 7 * 24 * 60 * 60 * 1000, // localStorage cache for 7 days
  MAX_CACHE_SIZE: 20, // Keep last 20 PDFs in memory
  MAX_BLOB_SIZE_FOR_STORAGE: 112 * 1024, // 112KB threshold (becomes ~150KB after base64)
  MAX_LOCALSTORAGE_ITEMS: 15, // Keep 15 PDF blobs in localStorage
  RETRY_ATTEMPTS: 2, // Retry failed generations
} as const

export const STORAGE_KEYS = {
  JOB_DETAILS: 'resumint_jobDetails',
  PERSONAL_DETAILS: 'resumint_personalDetails',
  EXPERIENCE: 'resumint_experience',
  PROJECTS: 'resumint_projects',
  EDUCATION: 'resumint_education',
  SETTINGS: 'resumint_settings',
  SKILLS: 'resumint_skills',
  RESUME_SKILLS: 'resumint_resume_skills',
} as const

export const FORM_IDS = {
  PERSONAL_DETAILS: 'personal',
  EXPERIENCE: 'experience',
  PROJECTS: 'projects',
  EDUCATION: 'education',
  SETTINGS: 'settings',
} as const

// Debounce delays
export const VALIDATION_DELAY = 250
export const TOUCH_DELAY = 300

// Durations
export const DROPPING_ANIMATION_DURATION = 250

// Form Data
export const PERSONAL_DETAILS_FORM_DATA_KEYS = {
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  LOCATION: 'location',
  LINKEDIN: 'linkedin',
  GITHUB: 'github',
  WEBSITE: 'website',
} as const

export const EXPERIENCE_FORM_DATA_KEYS = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  COMPANY_NAME: 'companyName',
  LOCATION: 'location',
  START_DATE_MONTH: 'startDate.month',
  START_DATE_YEAR: 'startDate.year',
  END_DATE_IS_PRESENT: 'endDate.isPresent',
  END_DATE_MONTH: 'endDate.month',
  END_DATE_YEAR: 'endDate.year',
  BULLET_POINTS: 'bulletPoints',
} as const

export const PROJECT_FORM_DATA_KEYS = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  TECHNOLOGIES: 'technologies',
  LINK: 'link',
  START_DATE_MONTH: 'startDate.month',
  START_DATE_YEAR: 'startDate.year',
  END_DATE_IS_PRESENT: 'endDate.isPresent',
  END_DATE_MONTH: 'endDate.month',
  END_DATE_YEAR: 'endDate.year',
  BULLET_POINTS: 'bulletPoints',
} as const

export const EDUCATION_FORM_DATA_KEYS = {
  INSTITUTION: 'institution',
  DEGREE: 'degree',
  DEGREE_STATUS: 'degreeStatus',
  LOCATION: 'location',
  START_DATE_MONTH: 'startDate.month',
  START_DATE_YEAR: 'startDate.year',
  END_DATE_MONTH: 'endDate.month',
  END_DATE_YEAR: 'endDate.year',
  DESCRIPTION: 'description',
} as const

export const SETTINGS_FORM_DATA_KEYS = {
  BULLETS_PER_EXPERIENCE_BLOCK: 'bulletsPerExperienceBlock',
  BULLETS_PER_PROJECT_BLOCK: 'bulletsPerProjectBlock',
  LANGUAGE_MODEL: 'languageModel',
  MAX_CHARS_PER_BULLET: 'maxCharsPerBullet',
} as const

export const LOGIN_FORM_DATA_KEYS = {
  EMAIL: 'email',
  PASSWORD: 'password',
  CONFIRM_PASSWORD: 'confirmPassword',
  MODE: 'mode',
} as const

export const DEFAULT_STATE_VALUES = {
  PERSONAL_DETAILS: {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  } as PersonalDetails,
  EXPERIENCE: [] as ExperienceBlockData[],
  PROJECTS: [] as ProjectBlockData[],
  EDUCATION: [] as EducationBlockData[],
  SETTINGS: {
    bulletsPerExperienceBlock: 4,
    bulletsPerProjectBlock: 3,
    languageModel: LanguageModel.GPT_4O_MINI,
    maxCharsPerBullet: 180,
    sectionOrder: [
      ResumeSection.EXPERIENCE,
      ResumeSection.PROJECTS,
      ResumeSection.EDUCATION,
      ResumeSection.SKILLS,
    ],
  } as AppSettings,
  JOB_DETAILS: {
    originalJobDescription: '',
    analysis: {
      skillsRequired: { hard: [], soft: [] },
      jobTitle: '',
      jobSummary: '',
      specialInstructions: '',
      location: { type: 'hybrid', details: '', listedLocation: '' },
      companyName: '',
      companyDescription: '',
      contextualSkills: [],
      salaryRange: '',
    } as JobDescriptionAnalysis,
  } as JobDetails,
  SKILLS: {
    hardSkills: { skills: [], suggestions: [] },
    softSkills: { skills: [], suggestions: [] },
  } as Skills,
  RESUME_SKILLS: [] as SkillBlock[],
} as const
