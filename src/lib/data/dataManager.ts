import { personalDetailsManager } from './personalDetailsManager'
import { experienceManager } from './experienceManager'
import { projectsManager } from './projectsManager'
import { settingsManager } from './settingsManager'
import { educationManager } from './educationManager'

import type { PersonalDetails } from '../types/personalDetails'
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
import { JobDescriptionAnalysis } from '../types/api'
import { EducationBlockData } from '../types/education'

class DataManager {
  // Personal Details
  getPersonalDetails(): Promise<PersonalDetails> {
    return personalDetailsManager.get()
  }

  async savePersonalDetails(data: PersonalDetails): Promise<void> {
    return personalDetailsManager.save(data)
  }

  invalidatePersonalDetails() {
    personalDetailsManager.invalidate()
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
  async getExperience(sectionId?: string) {
    return experienceManager.get(sectionId)
  }

  async saveExperience(data: ExperienceBlockData[]): Promise<void> {
    return experienceManager.save(data)
  }

  async saveExperienceBullet(data: ExperienceBulletPoint, sectionId: string) {
    return experienceManager.saveBullet(data, sectionId)
  }

  async saveExperienceBullets(
    bullets: ExperienceBulletPoint[],
    sectionId: string
  ) {
    return experienceManager.saveBullets(bullets, sectionId)
  }

  async deleteExperienceBullet(sectionId: string, bulletId: string) {
    return experienceManager.deleteBullet(sectionId, bulletId)
  }

  async toggleExperienceBulletLock(sectionId: string, bulletId: string) {
    return experienceManager.toggleBulletLock(sectionId, bulletId)
  }

  async toggleExperienceBulletLockAll(sectionId: string, shouldLock: boolean) {
    return experienceManager.toggleBulletLockAll(sectionId, shouldLock)
  }

  invalidateExperience() {
    experienceManager.invalidate()
  }

  // Projects
  async getProjects(sectionId?: string) {
    return projectsManager.get(sectionId)
  }

  async saveProjects(data: ProjectBlockData[]): Promise<void> {
    return projectsManager.save(data)
  }

  async saveProjectBullet(data: ProjectBulletPoint, sectionId: string) {
    return projectsManager.saveBullet(data, sectionId)
  }

  async saveProjectBullets(bullets: ProjectBulletPoint[], sectionId: string) {
    return projectsManager.saveBullets(bullets, sectionId)
  }

  async deleteProjectBullet(sectionId: string, bulletId: string) {
    return projectsManager.deleteBullet(sectionId, bulletId)
  }

  async toggleProjectBulletLock(sectionId: string, bulletId: string) {
    return projectsManager.toggleBulletLock(sectionId, bulletId)
  }

  async toggleProjectBulletLockAll(sectionId: string, shouldLock: boolean) {
    return projectsManager.toggleBulletLockAll(sectionId, shouldLock)
  }

  invalidateProjects() {
    projectsManager.invalidate()
  }

  // Education
  async getEducation(sectionId?: string) {
    return educationManager.get(sectionId)
  }

  async saveEducation(data: EducationBlockData[]): Promise<void> {
    return educationManager.save(data)
  }

  invalidateEducation() {
    educationManager.invalidate()
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    return settingsManager.get()
  }

  async saveSettings(data: AppSettings): Promise<void> {
    return settingsManager.save(data)
  }

  invalidateSettings() {
    settingsManager.invalidate()
  }
}

export const dataManager = new DataManager()
