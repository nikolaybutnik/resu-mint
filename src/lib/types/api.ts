import { BulletPoint, ProjectBlockData } from './projects'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { ExperienceBlockData } from '@/lib/types/experience'
import { AppSettings } from './settings'
import { EducationBlockData } from './education'

export interface MintResumeRequestData {
  sessionId: string
  personalDetails: PersonalDetails
  workExperience: ExperienceBlockData[]
  projects: ProjectBlockData[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  settings: AppSettings
}

export interface GenerateBulletsRequest {
  sections: {
    id: string
    type: 'project' | 'experience'
    title: string
    technologies?: string[]
    description: string
    existingBullets: BulletPoint[]
    targetBulletIds: string[]
  }[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  settings: AppSettings
  numBullets: number
}

export interface GenerateBulletsResponse {
  sectionId: string
  bullets: BulletPoint[]
}

export interface GeneratedBulletsResponseModel {
  project_bullets: { id: string; bullets: string[] }[]
  experience_bullets: { id: string; bullets: string[] }[]
}

export interface AnalyzeJobDescriptionRequest {
  sessionId: string
  jobDescription: string
  settings: AppSettings
}

export interface JobDescriptionAnalysis {
  skillsRequired: {
    hard: string[] // e.g., ["React", "TypeScript", "GraphQL"]
    soft: string[] // e.g., ["Collaboration", "Problem-solving", "Communication"]
  }
  jobTitle: string // e.g., "Developer III, Front End (Javascript)- Enterprise"
  jobSummary: string // Concise summary of responsibilities and role, ~100-150 words
  specialInstructions: string // e.g., "Submit portfolio to hiring@example.com with a cover letter"
  location: {
    type: 'remote' | 'hybrid' | 'on-site' // Primary work arrangement
    details: string // Clarifications, e.g., "Remote, but requires quarterly on-site meetings in Ottawa, ON"
    listedLocation: string // Raw location from posting, e.g., "Ottawa, ON (Remote)"
  }
  companyName: string // e.g., "Billy Bob's Solutions"
  companyDescription: string // e.g., "Billy Bob's Solutions is a software development company that specializes in building custom software solutions for businesses..."
  contextualTechnologies: string[] // e.g., ["AWS", "Docker", "Kafka"]
  salaryRange: string // e.g., "$100,000 - $120,000"
}

export interface CreatePdfRequest {
  personalDetails: PersonalDetails
  experienceSection: ExperienceBlockData[]
  projectSection: ProjectBlockData[]
  educationSection: EducationBlockData[]
}

export interface ParseSectionSkillsRequest {
  sectionDescriptions: string
  settings: AppSettings
}

export interface ParseSectionSkillsResponse {
  hardSkills: string[]
  softSkills: string[]
}
