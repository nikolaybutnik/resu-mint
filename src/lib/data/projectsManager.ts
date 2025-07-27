import { STORAGE_KEYS } from '../constants'
import { ProjectBlockData, BulletPoint } from '../types/projects'
import { projectBlockSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  isLocalStorageAvailable,
  isQuotaExceededError,
} from './dataUtils'

const CACHE_KEYS = {
  PROJECTS_LOCAL: 'projects-local',
  PROJECTS_API: 'projects-api',
} as const

class ProjectsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(
    sectionId?: string
  ): Promise<ProjectBlockData | ProjectBlockData[] | undefined> {
    const cacheKey = isAuthenticated()
      ? CACHE_KEYS.PROJECTS_API
      : CACHE_KEYS.PROJECTS_LOCAL

    if (!this.cache.has(cacheKey)) {
      const promise = new Promise<ProjectBlockData[]>((resolve) => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS)

          if (stored) {
            const parsed = JSON.parse(stored)
            const validation = projectBlockSchema.array().safeParse(parsed)

            if (validation.success) {
              resolve(validation.data)
            } else {
              console.warn(
                'Invalid projects in Local Storage, using defaults:',
                validation.error
              )
              resolve(DEFAULT_STATE_VALUES.PROJECTS)
            }
          } else {
            resolve(DEFAULT_STATE_VALUES.PROJECTS)
          }
        } catch (error) {
          console.error('Error loading projects, using defaults:', error)
          resolve(DEFAULT_STATE_VALUES.PROJECTS)
        }
      })
      this.cache.set(cacheKey, promise)
    }

    const allProjects = await (this.cache.get(cacheKey)! as Promise<
      ProjectBlockData[]
    >)

    if (sectionId) {
      return allProjects.find((block) => block.id === sectionId)
    }

    return allProjects
  }

  async save(data: ProjectBlockData[]): Promise<void> {
    const validation = projectBlockSchema.array().safeParse(data)
    if (!validation.success) {
      console.error('Invalid projects data, save aborted:', validation.error)
      throw new Error('Invalid projects data')
    }

    this.invalidate()

    if (!isLocalStorageAvailable()) {
      console.warn(
        'Local Storage not available, data will not persist across sessions'
      )

      const cacheKey = isAuthenticated()
        ? CACHE_KEYS.PROJECTS_API
        : CACHE_KEYS.PROJECTS_LOCAL

      this.cache.set(cacheKey, Promise.resolve(validation.data))
      return
    }

    try {
      localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(validation.data)
      )
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async saveBullet(data: BulletPoint, sectionId: string) {
    const existingProjects = (await this.get()) as ProjectBlockData[]
    const projectBlockToUpdate = existingProjects.find(
      (block) => block.id === sectionId
    )
    const bulletAlreadyExists = !!projectBlockToUpdate?.bulletPoints.find(
      (bullet) => bullet.id === data.id
    )

    let updatedBulletPoints = projectBlockToUpdate?.bulletPoints || []

    if (bulletAlreadyExists && projectBlockToUpdate) {
      updatedBulletPoints = projectBlockToUpdate?.bulletPoints.map((bullet) =>
        bullet.id === data.id ? data : bullet
      )
    } else {
      updatedBulletPoints.push({
        id: data.id,
        text: data.text,
        isLocked: data.isLocked,
      })
    }

    try {
      const updatedProjects = existingProjects.map((block) =>
        block.id === sectionId
          ? { ...block, bulletPoints: updatedBulletPoints }
          : block
      )

      const validation = projectBlockSchema.array().safeParse(updatedProjects)
      if (!validation.success) {
        console.error(
          'Invalid projects data after bullet update, save aborted:',
          validation.error
        )
        throw new Error('Invalid projects data')
      }

      localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(validation.data)
      )

      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async saveBullets(bullets: BulletPoint[], sectionId: string) {
    const existingProjects = (await this.get()) as ProjectBlockData[]

    try {
      const updatedProjects = existingProjects.map((block) =>
        block.id === sectionId ? { ...block, bulletPoints: bullets } : block
      )

      const validation = projectBlockSchema.array().safeParse(updatedProjects)
      if (!validation.success) {
        console.error(
          'Invalid projects data after bullets update, save aborted:',
          validation.error
        )
        throw new Error('Invalid projects data')
      }

      localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(validation.data)
      )

      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async deleteBullet(sectionId: string, bulletId: string) {
    const existingProjects = (await this.get()) as ProjectBlockData[]
    const projectBlockToUpdate = existingProjects.find(
      (block) => block.id === sectionId
    )
    const bulletAlreadyExists = !!projectBlockToUpdate?.bulletPoints.find(
      (bullet) => bullet.id === bulletId
    )

    if (!bulletAlreadyExists) {
      throw new Error('Bullet not found')
    }

    const updatedBulletPoints = projectBlockToUpdate?.bulletPoints.filter(
      (bullet) => bullet.id !== bulletId
    )

    const updatedProjects = existingProjects.map((block) =>
      block.id === sectionId
        ? { ...block, bulletPoints: updatedBulletPoints }
        : block
    )

    try {
      const validation = projectBlockSchema.array().safeParse(updatedProjects)
      if (!validation.success) {
        console.error(
          'Invalid projects data after bullet deletion, save aborted:',
          validation.error
        )
        throw new Error('Invalid projects data')
      }

      localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(validation.data)
      )
      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async toggleBulletLock(sectionId: string, bulletId: string) {
    const existingProjects = (await this.get()) as ProjectBlockData[]
    const projectBlockToUpdate = existingProjects.find(
      (block) => block.id === sectionId
    )
    const updatedBulletPoints = projectBlockToUpdate?.bulletPoints.map(
      (bullet) =>
        bullet.id === bulletId
          ? { ...bullet, isLocked: !bullet.isLocked }
          : bullet
    )
    const updatedProjects = existingProjects.map((block) =>
      block.id === sectionId
        ? { ...block, bulletPoints: updatedBulletPoints }
        : block
    )

    try {
      const validation = projectBlockSchema.array().safeParse(updatedProjects)
      if (!validation.success) {
        console.error(
          'Invalid projects data after bullet lock toggle, save aborted:',
          validation.error
        )
        throw new Error('Invalid projects data')
      }

      localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(validation.data)
      )
      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  async toggleBulletLockAll(sectionId: string, shouldLock: boolean) {
    const existingProjects = (await this.get()) as ProjectBlockData[]
    const projectBlockToUpdate = existingProjects.find(
      (block) => block.id === sectionId
    )
    const updatedBulletPoints = projectBlockToUpdate?.bulletPoints.map(
      (bullet) => ({ ...bullet, isLocked: shouldLock })
    )
    const updatedProjects = existingProjects.map((block) =>
      block.id === sectionId
        ? { ...block, bulletPoints: updatedBulletPoints }
        : block
    )

    try {
      const validation = projectBlockSchema.array().safeParse(updatedProjects)
      if (!validation.success) {
        console.error(
          'Invalid projects data after bulk lock toggle, save aborted:',
          validation.error
        )
        throw new Error('Invalid projects data')
      }

      localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify(validation.data)
      )
      this.invalidate()
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.warn('Local Storage quota exceeded')
        throw new Error('Storage quota exceeded. Please clear browser data.')
      }
      throw error
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEYS.PROJECTS_LOCAL)
    this.cache.delete(CACHE_KEYS.PROJECTS_API)
  }
}

export const projectsManager = new ProjectsManager()
