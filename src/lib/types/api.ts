import { BulletPoint, ProjectBlockData } from './projects'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { ExperienceBlockData } from '@/lib/types/experience'
import { AppSettings } from './settings'
import { EducationBlockData } from './education'
import { JobDescriptionAnalysis } from './jobDetails'
import { SkillBlock, Skills } from './skills'

export type SectionType = 'experience' | 'project'

export interface Section {
  id: string
  type: SectionType
  title: string
  technologies?: string[]
  description: string
  existingBullets: BulletPoint[]
  targetBulletIds: string[]
}

export interface GenerateBulletsRequest {
  sections: Section[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  settings: AppSettings
  numBullets: number
}

export interface GenerateBulletsResponse {
  sectionId: string
  bullets: BulletPoint[]
}

export interface AnalyzeJobDescriptionRequest {
  jobDescription: string
  settings: AppSettings
}

export interface CreatePdfRequest {
  personalDetails: PersonalDetails
  experienceSection: ExperienceBlockData[]
  projectSection: ProjectBlockData[]
  educationSection: EducationBlockData[]
  skillsSection: SkillBlock[]
  settings: AppSettings
}

export interface GenerateSkillSuggestionsRequest {
  jobAnalysis: JobDescriptionAnalysis
  currentSkills: {
    hardSkills: { skills: string[] }
    softSkills: { skills: string[] }
  }
  userExperience: string[]
  settings: AppSettings
}

export interface GenerateSkillSuggestionsResponse {
  hardSkillSuggestions: string[]
  softSkillSuggestions: string[]
}

export interface ExtractSkillsRequest {
  experienceSections: ExperienceBlockData[]
  projectSections: ProjectBlockData[]
  currentSkills: Skills
  settings: AppSettings
}

export interface ExtractSkillsResponse {
  hardSkills: string[]
  softSkills: string[]
}
