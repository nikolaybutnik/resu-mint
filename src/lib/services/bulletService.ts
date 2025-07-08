import { api } from './api'
import { ROUTES } from '@/lib/constants'
import {
  GenerateBulletsRequest,
  GenerateBulletsResponse,
} from '@/lib/types/api'
import { sanitizeResumeBullet } from '@/lib/utils'
import { BulletPoint } from '../types/experience'
import { dataManager } from '@/lib/data/dataManager'
import { useExperienceStore } from '@/stores'
import { bulletTextValidationSchema } from '../validationSchemas'

const updateSectionWithBullet = <
  T extends { id: string; bulletPoints: BulletPoint[] }
>(
  sections: T[],
  sectionId: string,
  bullet: BulletPoint
): T[] => {
  return sections.map((section) =>
    section.id === sectionId
      ? {
          ...section,
          bulletPoints: [
            ...section.bulletPoints.filter((b) => b.id !== bullet.id),
            bullet,
          ],
        }
      : section
  )
}

export const bulletService = {
  generateBullets: async (
    params: GenerateBulletsRequest
  ): Promise<GenerateBulletsResponse[]> => {
    try {
      const response = await api.post<
        GenerateBulletsRequest,
        GenerateBulletsResponse[]
      >(ROUTES.GENERATE_BULLETS, params)
      return response.map((item: GenerateBulletsResponse) => ({
        sectionId: item.sectionId,
        bullets: item.bullets.map((bullet) => ({
          id: bullet.id,
          text: sanitizeResumeBullet(bullet.text, true),
          isLocked: bullet.isLocked,
        })),
      }))
    } catch (error) {
      console.error('Error generating bullets:', error)
      throw new Error('Failed to generate bullets')
    }
  },

  saveBullet: async (
    bullet: BulletPoint,
    sectionId: string,
    sectionType: 'experience' | 'project',
    maxCharsPerBullet: number
  ): Promise<void> => {
    const validation = bulletTextValidationSchema.safeParse({
      text: bullet.text,
      maxCharsPerBullet,
    })

    if (!validation.success) {
      throw new Error(validation.error.message)
    }

    try {
      if (sectionType === 'experience') {
        await dataManager.saveExperienceBullet(bullet, sectionId)
      } else if (sectionType === 'project') {
        await dataManager.saveProjectBullet(bullet, sectionId)
      }

      const cleanBullet = {
        id: bullet.id,
        text: bullet.text,
        isLocked: bullet.isLocked ?? false,
      }

      if (sectionType === 'experience') {
        const experienceStore = useExperienceStore.getState()
        const updatedData = updateSectionWithBullet(
          experienceStore.data,
          sectionId,
          cleanBullet
        )

        await experienceStore.save(updatedData)
      } else if (sectionType === 'project') {
        // TODO: handle project bullet saving when Zustand store is implemented
        // const projectStore = useProjectStore.getState()
        // const updatedData = updateSectionWithBullet(
        //   projectStore.data,
        //   sectionId,
        //   cleanBullet
        // )
        // await projectStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error saving bullet:', error)
      throw new Error('Failed to save bullet')
    }
  },

  deleteBullet: async (
    sectionId: string,
    sectionType: 'experience' | 'project',
    bulletId: string
  ): Promise<void> => {
    try {
      if (sectionType === 'experience') {
        await dataManager.deleteExperienceBullet(sectionId, bulletId)

        const experienceStore = useExperienceStore.getState()
        const updatedData = experienceStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints.filter(
                  (bullet) => bullet.id !== bulletId
                ),
              }
            : section
        )

        await experienceStore.save(updatedData)
      } else if (sectionType === 'project') {
        await dataManager.deleteProjectBullet(sectionId, bulletId)
        // TODO: handle project bullet deletion when Zustand store is implemented

        // const projectStore = useProjectStore.getState()
        // const updatedData = projectStore.data.map((section) =>
        //   section.id === sectionId
        //     ? {
        //         ...section,
        //         bulletPoints: section.bulletPoints.filter(
        //           (bullet) => bullet.id !== bulletId
        //         ),
        //       }
        //     : section
        // )

        // await projectStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error deleting bullet:', error)
      throw new Error('Failed to delete bullet')
    }
  },

  toggleBulletLock: async (
    sectionId: string,
    sectionType: 'experience' | 'project',
    bulletId: string
  ): Promise<void> => {
    try {
      if (sectionType === 'experience') {
        await dataManager.toggleExperienceBulletLock(sectionId, bulletId)
        const experienceStore = useExperienceStore.getState()
        const updatedData = experienceStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints.map((bullet) =>
                  bullet.id === bulletId
                    ? { ...bullet, isLocked: !bullet.isLocked }
                    : bullet
                ),
              }
            : section
        )

        await experienceStore.save(updatedData)
      } else if (sectionType === 'project') {
        // await dataManager.toggleProjectBulletLock(bulletId, sectionId)
        // TODO: handle project bullet lock toggling when Zustand store is implemented
        // const projectStore = useProjectStore.getState()
        // const updatedData = projectStore.data.map((section) =>
        //   section.id === sectionId
        //     ? { ...section, bulletPoints: section.bulletPoints.map((bullet) =>
        //         bullet.id === bulletId ? { ...bullet, isLocked: !bullet.isLocked } : bullet
        //       ),
        //     }
        //     : section
        // )
        // await projectStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error toggling bullet lock:', error)
      throw new Error('Failed to toggle bullet lock')
    }
  },

  toggleBulletLockAll: async (
    sectionId: string,
    sectionType: 'experience' | 'project',
    shouldLock: boolean
  ): Promise<void> => {
    try {
      if (sectionType === 'experience') {
        await dataManager.toggleExperienceBulletLockAll(sectionId, shouldLock)

        const experienceStore = useExperienceStore.getState()
        const updatedData = experienceStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints.map((bullet) => ({
                  ...bullet,
                  isLocked: shouldLock,
                })),
              }
            : section
        )

        await experienceStore.save(updatedData)
      } else if (sectionType === 'project') {
        // await dataManager.toggleProjectBulletLockAll(sectionId, shouldLock)
        // TODO: handle project bullet lock all toggling when Zustand store is implemented
        // const projectStore = useProjectStore.getState()
        // const updatedData = projectStore.data.map((section) =>
        //   section.id === sectionId
        //     ? { ...section, bulletPoints: section.bulletPoints.map((bullet) => ({ ...bullet, isLocked: shouldLock })),
        //     }
        //     : section
        // )
        // await projectStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error toggling bullet lock all:', error)
      throw new Error('Failed to toggle bullet lock all')
    }
  },
}
