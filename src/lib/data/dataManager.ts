import { personalDetailsManager } from './personalDetailsManager'
import { experienceManager } from './experienceManager'
import { projectsManager } from './projectsManager'
import { settingsManager } from './settingsManager'
import { educationManager } from './educationManager'
import { skillsManager } from './skillsManager'
import type { PersonalDetails } from '../types/personalDetails'
import type { Result } from '../types/errors'
import type {
  ExperienceBlockData,
  BulletPoint as ExperienceBulletPoint,
} from '../types/experience'
import type {
  ProjectBlockData,
  BulletPoint as ProjectBulletPoint,
} from '../types/projects'
import type { AppSettings } from '../types/settings'
import { JobDetails } from '../types/jobDetails'
import { jobDetailsManager } from './jobDetailsManager'
import { JobDescriptionAnalysis } from '../types/jobDetails'
import { EducationBlockData } from '../types/education'
import { SkillBlock, Skills } from '../types/skills'

class DataManager {
  // Personal Details
  getPersonalDetails(): Promise<PersonalDetails> {
    return personalDetailsManager.get()
  }

  async savePersonalDetails(
    data: PersonalDetails
  ): Promise<Result<PersonalDetails>> {
    return personalDetailsManager.save(data)
  }

  // Job Details
  async getJobDetails(): Promise<JobDetails> {
    return jobDetailsManager.get()
  }

  async saveJobDescription(data: string): Promise<void> {
    return jobDetailsManager.saveJobDescription(data)
  }

  async saveAnalysis(data: JobDescriptionAnalysis): Promise<void> {
    return jobDetailsManager.saveAnalysis(data)
  }

  invalidateJobDetails() {
    jobDetailsManager.invalidate()
  }

  // Experience
  async getExperience(
    sectionId?: string
  ): Promise<ExperienceBlockData | ExperienceBlockData[] | undefined> {
    return experienceManager.get(sectionId)
  }

  async saveExperience(
    data: ExperienceBlockData
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.upsert(data)
  }

  async deleteExperience(
    blockId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.delete(blockId)
  }

  async reorderExperience(
    data: ExperienceBlockData[]
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.reorder(data)
  }

  async saveExperienceBullet(
    data: ExperienceBulletPoint,
    sectionId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.saveBullet(data, sectionId)
  }

  async saveExperienceBullets(
    bullets: ExperienceBulletPoint[],
    sectionId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.saveBullets(bullets, sectionId)
  }

  async deleteExperienceBullet(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.deleteBullet(sectionId, bulletId)
  }

  async deleteExperienceBullets(
    sectionId: string,
    bulletIds: string[]
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.deleteBullets(sectionId, bulletIds)
  }

  async toggleExperienceBulletLock(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.toggleBulletLock(sectionId, bulletId)
  }

  async toggleExperienceBulletLockAll(
    sectionId: string,
    shouldLock: boolean
  ): Promise<Result<ExperienceBlockData[]>> {
    return experienceManager.toggleBulletLockAll(sectionId, shouldLock)
  }

  // Projects
  async getProjects(
    sectionId?: string
  ): Promise<ProjectBlockData | ProjectBlockData[] | undefined> {
    return projectsManager.get(sectionId)
  }

  async saveProject(
    data: ProjectBlockData
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.upsert(data)
  }

  async deleteProject(blockId: string): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.delete(blockId)
  }

  async reorderProjects(
    data: ProjectBlockData[]
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.reorder(data)
  }

  async saveProjectBullet(
    data: ProjectBulletPoint,
    sectionId: string
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.saveBullet(data, sectionId)
  }

  async saveProjectBullets(
    bullets: ProjectBulletPoint[],
    sectionId: string
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.saveBullets(bullets, sectionId)
  }

  async deleteProjectBullet(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.deleteBullet(sectionId, bulletId)
  }

  async deleteProjectBullets(
    sectionId: string,
    bulletIds: string[]
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.deleteBullets(sectionId, bulletIds)
  }

  async toggleProjectBulletLock(
    sectionId: string,
    bulletId: string
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.toggleBulletLock(sectionId, bulletId)
  }

  async toggleProjectBulletLockAll(
    sectionId: string,
    shouldLock: boolean
  ): Promise<Result<ProjectBlockData[]>> {
    return projectsManager.toggleBulletLockAll(sectionId, shouldLock)
  }

  // Education
  async getEducation(
    sectionId?: string
  ): Promise<EducationBlockData | EducationBlockData[] | undefined> {
    return educationManager.get(sectionId)
  }

  async saveEducation(
    data: EducationBlockData
  ): Promise<Result<EducationBlockData[]>> {
    return educationManager.upsert(data)
  }

  async deleteEducation(
    blockId: string
  ): Promise<Result<EducationBlockData[]>> {
    return educationManager.delete(blockId)
  }

  async reorderEducation(
    data: EducationBlockData[]
  ): Promise<Result<EducationBlockData[]>> {
    return educationManager.reorder(data)
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    return settingsManager.get()
  }

  async saveSettings(data: AppSettings): Promise<Result<AppSettings>> {
    return settingsManager.save(data)
  }

  // Skills
  async getSkills(): Promise<Skills> {
    return skillsManager.getSkills()
  }

  async saveSkills(data: Skills): Promise<void> {
    return skillsManager.saveSkills(data)
  }

  invalidateSkills() {
    skillsManager.invalidateSkills()
  }

  // Resume Skills
  async getResumeSkills(): Promise<SkillBlock[]> {
    return skillsManager.getResumeSkills()
  }

  async saveResumeSkills(data: SkillBlock[]): Promise<void> {
    return skillsManager.saveResumeSkills(data)
  }

  invalidateResumeSkills() {
    skillsManager.invalidateResumeSkills()
  }
}
export const dataManager = new DataManager()
