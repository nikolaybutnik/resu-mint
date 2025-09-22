import { api } from './api'
import { API_ROUTES } from '@/lib/constants'
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
import {
  zodErrorsToFormErrors,
  Result,
  Success,
  Failure,
  createValidationError,
  createUnknownError,
} from '../types/errors'

const generateBulletsApi = async (
  params: GenerateBulletsRequest
): Promise<GenerateBulletsResponse[]> => {
  try {
    const response = await api.post<
      GenerateBulletsRequest,
      GenerateBulletsResponse[]
    >(API_ROUTES.GENERATE_BULLETS, params)
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

    if (
      (error instanceof Error &&
        error.message.includes('AI generated empty bullets')) ||
      (typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 422)
    ) {
      throw new Error('INSUFFICIENT_CONTEXT')
    }

    throw error
  }
}

export const bulletService = {
  saveBullet: async (
    bullet: BulletPoint,
    sectionId: string,
    sectionType: SectionType,
    maxCharsPerBullet: number
  ): Promise<Result<void>> => {
    try {
      const validation = bulletTextValidationSchema.safeParse({
        text: bullet.text,
        maxCharsPerBullet,
      })

      if (!validation.success) {
        const errors = zodErrorsToFormErrors(validation.error)
        // bulletTooLong is non-blocking
        if (!errors.bulletTooLong) {
          return Failure(
            createValidationError('Invalid bullet data', validation.error)
          )
        }
      }

      const cleanBullet = {
        id: bullet.id,
        text: bullet.text,
        isLocked: bullet.isLocked ?? false,
      }

      if (sectionType === 'experience') {
        const experienceStore = useExperienceStore.getState()
        const saveResult = await experienceStore.saveBullet(
          cleanBullet,
          sectionId
        )
        if (saveResult.error) {
          return Failure(saveResult.error)
        }
        return Success(undefined)
      } else if (sectionType === 'project') {
        // TODO: Update when project manager supports Result pattern
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
        return Success(undefined)
      }

      return Failure(createValidationError('Invalid section type'))
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullet save', error)
      )
    }
  },

  deleteBullet: async (
    sectionId: string,
    sectionType: SectionType,
    bulletId: string
  ): Promise<Result<void>> => {
    try {
      if (sectionType === 'experience') {
        const experienceStore = useExperienceStore.getState()
        const deleteResult = await experienceStore.deleteBullet(
          sectionId,
          bulletId
        )
        if (deleteResult.error) {
          return Failure(deleteResult.error)
        }
        return Success(undefined)
      } else if (sectionType === 'project') {
        // TODO: Update when project manager supports Result pattern
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
        return Success(undefined)
      }

      return Failure(createValidationError('Invalid section type'))
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullet deletion', error)
      )
    }
  },

  toggleBulletLock: async (
    sectionId: string,
    sectionType: SectionType,
    bulletId: string
  ): Promise<Result<void>> => {
    try {
      if (sectionType === 'experience') {
        const experienceStore = useExperienceStore.getState()
        const toggleResult = await experienceStore.toggleBulletLock(
          sectionId,
          bulletId
        )
        if (toggleResult.error) {
          return Failure(toggleResult.error)
        }
        return Success(undefined)
      } else if (sectionType === 'project') {
        // TODO: Update when project manager supports Result pattern
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
        return Success(undefined)
      }

      return Failure(createValidationError('Invalid section type'))
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bullet lock toggle', error)
      )
    }
  },

  toggleBulletLockAll: async (
    sectionId: string,
    sectionType: SectionType,
    shouldLock: boolean
  ): Promise<Result<void>> => {
    try {
      if (sectionType === 'experience') {
        const experienceStore = useExperienceStore.getState()
        const toggleResult = await experienceStore.toggleBulletLockAll(
          sectionId,
          shouldLock
        )
        if (toggleResult.error) {
          return Failure(toggleResult.error)
        }
        return Success(undefined)
      } else if (sectionType === 'project') {
        // TODO: Update when project manager supports Result pattern
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
        return Success(undefined)
      }

      return Failure(createValidationError('Invalid section type'))
    } catch (error) {
      return Failure(
        createUnknownError('Unexpected error during bulk lock toggle', error)
      )
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
    if (sections.some((sec) => !sec.description)) {
      throw new Error('INSUFFICIENT_CONTEXT')
    }

    const payload: GenerateBulletsRequest = {
      sections,
      jobDescriptionAnalysis,
      settings,
      numBullets: numBullets || settings.bulletsPerExperienceBlock,
    }

    const generatedData = await generateBulletsApi(payload)

    return generatedData || []
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
  },
}
