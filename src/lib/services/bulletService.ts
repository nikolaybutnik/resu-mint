import { api } from './api'
import { ROUTES } from '@/lib/constants'
import {
  GenerateBulletsRequest,
  GenerateBulletsResponse,
  Section,
  SectionType,
} from '@/lib/types/api'
import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'
import { sanitizeResumeBullet } from '@/lib/utils'
import { BulletPoint } from '../types/experience'
import { useExperienceStore } from '@/stores'
import { useProjectStore } from '@/stores'
import { bulletTextValidationSchema } from '../validationSchemas'
import { AppSettings } from '../types/settings'
import { zodErrorsToFormErrors } from '../types/errors'

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
    sectionType: SectionType,
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
      const cleanBullet = {
        id: bullet.id,
        text: bullet.text,
        isLocked: bullet.isLocked ?? false,
      }
      if (sectionType === 'experience') {
        const dataStore = useExperienceStore.getState()
        const updatedData = dataStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints
                  .filter((b) => b.id !== cleanBullet.id)
                  .concat(cleanBullet),
              }
            : section
        )
        await dataStore.save(updatedData)
      } else if (sectionType === 'project') {
        const dataStore = useProjectStore.getState()
        const updatedData = dataStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints
                  .filter((b) => b.id !== cleanBullet.id)
                  .concat(cleanBullet),
              }
            : section
        )
        await dataStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error saving bullet:', error)
      throw new Error('Failed to save bullet')
    }
  },

  deleteBullet: async (
    sectionId: string,
    sectionType: SectionType,
    bulletId: string
  ): Promise<void> => {
    try {
      if (sectionType === 'experience') {
        const dataStore = useExperienceStore.getState()
        const updatedData = dataStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints.filter(
                  (bullet) => bullet.id !== bulletId
                ),
              }
            : section
        )
        await dataStore.save(updatedData)
      } else if (sectionType === 'project') {
        const dataStore = useProjectStore.getState()
        const updatedData = dataStore.data.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                bulletPoints: section.bulletPoints.filter(
                  (bullet) => bullet.id !== bulletId
                ),
              }
            : section
        )
        await dataStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error deleting bullet:', error)
      throw new Error('Failed to delete bullet')
    }
  },

  toggleBulletLock: async (
    sectionId: string,
    sectionType: SectionType,
    bulletId: string
  ): Promise<void> => {
    try {
      if (sectionType === 'experience') {
        const dataStore = useExperienceStore.getState()
        const updatedData = dataStore.data.map((section) =>
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
        await dataStore.save(updatedData)
      } else if (sectionType === 'project') {
        const dataStore = useProjectStore.getState()
        const updatedData = dataStore.data.map((section) =>
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
        await dataStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error toggling bullet lock:', error)
      throw new Error('Failed to toggle bullet lock')
    }
  },

  toggleBulletLockAll: async (
    sectionId: string,
    sectionType: SectionType,
    shouldLock: boolean
  ): Promise<void> => {
    try {
      if (sectionType === 'experience') {
        const dataStore = useExperienceStore.getState()
        const updatedData = dataStore.data.map((section) =>
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
        await dataStore.save(updatedData)
      } else if (sectionType === 'project') {
        const dataStore = useProjectStore.getState()
        const updatedData = dataStore.data.map((section) =>
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
        await dataStore.save(updatedData)
      }
    } catch (error) {
      console.error('Error toggling bullet lock all:', error)
      throw new Error('Failed to toggle bullet lock all')
    }
  },

  generateBulletsForSections: async (
    sections: Section[],
    jobDescriptionAnalysis: JobDescriptionAnalysis,
    settings: AppSettings,
    numBullets?: number
  ): Promise<
    {
      sectionId: string
      bullets: BulletPoint[]
    }[]
  > => {
    try {
      const payload: GenerateBulletsRequest = {
        sections,
        jobDescriptionAnalysis,
        settings,
        numBullets: numBullets || settings.bulletsPerExperienceBlock,
      }

      const generatedData = await generateBulletsApi(payload)

      return generatedData || []
    } catch (error) {
      console.error('Error generating bullets for sections:', error)
      throw new Error('Failed to generate bullets for sections')
    }
  },

  generateBulletsForSection: async (
    sectionId: string,
    sectionType: SectionType,
    bullets: BulletPoint[],
    jobDescriptionAnalysis: JobDescriptionAnalysis,
    settings: AppSettings
  ): Promise<{
    sectionId: string
    bullets: BulletPoint[]
  } | null> => {
    try {
      let storedState
      if (sectionType === 'experience') {
        storedState = useExperienceStore.getState()
      } else if (sectionType === 'project') {
        storedState = useProjectStore.getState()
      }
      const allExistingBullets = storedState?.data?.find(
        (section) => section.id === sectionId
      )?.bulletPoints

      const remainingBullets = allExistingBullets?.filter(
        (bullet) => !bullets.some((b) => b.id === bullet.id)
      )

      const sectionData = storedState?.data?.find(
        (section) => section.id === sectionId
      )

      const section: Section = {
        id: sectionId,
        type: sectionType,
        title: sectionData?.title || '',
        description: sectionData?.description || '',
        existingBullets: remainingBullets || [],
        targetBulletIds: bullets.map((b) => b.id),
      }

      const results = await bulletService.generateBulletsForSections(
        [section],
        jobDescriptionAnalysis,
        settings,
        bullets.length
      )

      return results.length > 0 ? results[0] : null
    } catch (error) {
      console.error('Error regenerating bullet:', error)
      throw new Error('Failed to regenerate bullet')
    }
  },
}
