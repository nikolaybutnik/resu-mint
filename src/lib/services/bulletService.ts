import { api } from './api'
import { ROUTES } from '@/lib/constants'
import {
  GenerateBulletsRequest,
  GenerateBulletsResponse,
  JobDescriptionAnalysis,
} from '@/lib/types/api'
import { sanitizeResumeBullet } from '@/lib/utils'
import { BulletPoint } from '../types/experience'
import { dataManager } from '@/lib/data/dataManager'
import { useExperienceStore } from '@/stores'
import { bulletTextValidationSchema } from '../validationSchemas'
import { AppSettings } from '../types/settings'
import { zodErrorsToFormErrors } from '../types/errors'

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

const generateBulletsApi = async (
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
}

export const bulletService = {
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
      const errors = zodErrorsToFormErrors(validation.error)
      if (!errors.bulletTooLong) {
        throw new Error(validation.error.message)
      }
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
      let dataStore = null

      if (sectionType === 'experience') {
        dataStore = useExperienceStore.getState()
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // dataStore = useProjectStore.getState()
      }

      const updatedData = updateSectionWithBullet(
        dataStore?.data || [],
        sectionId,
        cleanBullet
      )

      await dataStore?.save(updatedData)
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
      } else if (sectionType === 'project') {
        await dataManager.deleteProjectBullet(sectionId, bulletId)
      }

      let dataStore = null

      if (sectionType === 'experience') {
        dataStore = useExperienceStore.getState()
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // dataStore = useProjectStore.getState()
      }

      const updatedData = dataStore?.data.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              bulletPoints: section.bulletPoints.filter(
                (bullet) => bullet.id !== bulletId
              ),
            }
          : section
      )

      if (updatedData) {
        await dataStore?.save(updatedData)
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
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // await dataManager.toggleProjectBulletLock(bulletId, sectionId)
      }

      let dataStore = null

      if (sectionType === 'experience') {
        dataStore = useExperienceStore.getState()
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // dataStore = useProjectStore.getState()
      }

      const updatedData = dataStore?.data.map((section) =>
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

      if (updatedData) {
        await dataStore?.save(updatedData)
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
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // await dataManager.toggleProjectBulletLockAll(sectionId, shouldLock)
      }

      let dataStore = null

      if (sectionType === 'experience') {
        dataStore = useExperienceStore.getState()
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // dataStore = useProjectStore.getState()
      }

      const updatedData = dataStore?.data.map((section) =>
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

      if (updatedData) {
        await dataStore?.save(updatedData)
      }
    } catch (error) {
      console.error('Error toggling bullet lock all:', error)
      throw new Error('Failed to toggle bullet lock all')
    }
  },

  generateBulletsForSection: async (
    sectionId: string,
    sectionType: 'experience' | 'project',
    bullets: BulletPoint[],
    jobDescriptionAnalysis: JobDescriptionAnalysis,
    settings: AppSettings
  ): Promise<{
    sectionId: string
    bullets: BulletPoint[]
  } | null> => {
    try {
      let storedState = null

      if (sectionType === 'experience') {
        storedState = useExperienceStore.getState()
      } else if (sectionType === 'project') {
        // TODO: uncomment after implementing project store
        // storedState = useProjectStore.getState()
      }

      const allExistingBullets = storedState?.data?.find(
        (section) => section.id === sectionId
      )?.bulletPoints

      const remainingBullets = allExistingBullets?.filter(
        (bullet) => !bullets.some((b) => b.id === bullet.id)
      )

      const payload: GenerateBulletsRequest = {
        sections: [
          {
            id: sectionId,
            type: sectionType,
            title: jobDescriptionAnalysis.jobTitle,
            description: jobDescriptionAnalysis.jobSummary,
            existingBullets: remainingBullets || [],
            targetBulletIds: bullets.map((b) => b.id),
          },
        ],
        jobDescriptionAnalysis,
        settings,
        numBullets: bullets.length,
      }

      const generatedData = await generateBulletsApi(payload)

      return {
        sectionId,
        bullets: generatedData?.[0]?.bullets || [],
      }
    } catch (error) {
      console.error('Error regenerating bullet:', error)
      throw new Error('Failed to regenerate bullet')
    }
  },
}
