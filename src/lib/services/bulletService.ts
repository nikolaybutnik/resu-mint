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

  generateBulletsForSection: async (
    sectionId: string,
    sectionType: 'experience' | 'project',
    bullets: BulletPoint[],
    jobDescriptionAnalysis: JobDescriptionAnalysis,
    settings: AppSettings
  ): Promise<GenerateBulletsResponse> => {
    try {
      if (sectionType === 'experience') {
        // await dataManager.regenerateExperienceBullet(sectionId, bullet)

        const experienceStore = useExperienceStore.getState()
        const allExistingBullets = experienceStore.data.find(
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

        // const generatedData = await generateBulletsApi(payload)

        // console.log('generatedData', generatedData)

        // TODO: finish implementing after job description analysis is moved to Zustand store
      } else if (sectionType === 'project') {
        // await dataManager.regenerateProjectBullet(sectionId, bullet)
      }

      return {
        sectionId,
        bullets: [],
      }
    } catch (error) {
      console.error('Error regenerating bullet:', error)
      throw new Error('Failed to regenerate bullet')
    }
  },
}

// TODO: remove
/**
 * Regenerates a single bullet point for a experience section.
 * @param sectionId - The ID of the experience section to regenerate.
 * @param index - The index of the bullet point to regenerate.
 * @param formData - The form data of the experience block if it is being edited.
 * @param shouldSave - Whether to save the regenerated bullet to storage.
 */
// const handleBulletRegenerate = useCallback(
//   async (
//     sectionId: string,
//     index: number,
//     formData?: ExperienceBlockData,
//     shouldSave?: boolean
//   ) => {
//     const data = formData || findExperience(sectionId)
//     if (!data) return

//     try {
//       setRegeneratingBullet({ section: sectionId, index })

//       let regeneratingBulletId: string | null = null
//       let existingBullets: BulletPoint[] = []
//       let payloadSection: GenerateBulletsRequest['sections'] = []

//       if (formData) {
//         regeneratingBulletId = formData.bulletPoints[index].id
//         existingBullets = formData.bulletPoints.filter(
//           (bullet) => bullet.id !== regeneratingBulletId
//         )
//         payloadSection = [
//           {
//             id: sectionId,
//             type: 'experience',
//             title: formData.title,
//             description: formData.description || '',
//             existingBullets: formData.bulletPoints
//               .filter((bullet) => bullet.id !== regeneratingBulletId)
//               .map((bp) => ({ ...bp, isLocked: bp.isLocked ?? false })),
//             targetBulletIds: [regeneratingBulletId],
//           },
//         ]
//       } else {
//         regeneratingBulletId = data.bulletPoints[index].id
//         existingBullets = data.bulletPoints.filter(
//           (bullet) => bullet.id !== regeneratingBulletId
//         )
//         payloadSection = [
//           {
//             id: sectionId,
//             type: 'experience',
//             title: data.title,
//             description: data.description || '',
//             existingBullets: existingBullets.map((bp) => ({
//               ...bp,
//               isLocked: bp.isLocked ?? false,
//             })),
//             targetBulletIds: [regeneratingBulletId],
//           },
//         ]
//       }

//       const payload: GenerateBulletsRequest = {
//         sections: payloadSection,
//         jobDescriptionAnalysis,
//         settings,
//         numBullets: 1,
//       }

//       const generatedData = await bulletService.generateBullets(payload)

//       if (generatedData.length > 0) {
//         const [generatedSection] = generatedData
//         const [generatedBullet] = generatedSection.bullets

//         // If bullet in edit mode, update textarea only
//         if (
//           editingBullet &&
//           editingBullet.section === sectionId &&
//           editingBullet.index === index
//         ) {
//           setEditingBullet((prev) => {
//             if (!prev) return null
//             return { ...prev, text: generatedBullet.text }
//           })
//         } else {
//           // Else, update bullet in local state
//           const sourceData = formData || data
//           const updatedBullets = sourceData.bulletPoints.map((bullet) =>
//             bullet.id === regeneratingBulletId
//               ? { ...bullet, text: generatedBullet.text }
//               : bullet
//           )
//           const updatedExperience = {
//             ...sourceData,
//             bulletPoints: updatedBullets,
//           }

//           updateExperience(updatedExperience)
//           // Use explicit shouldSave parameter, or default to !formData for backwards compatibility
//           const shouldSaveToStorage =
//             shouldSave !== undefined ? shouldSave : !formData
//           if (shouldSaveToStorage) {
//             onSave(
//               workExperience.map((experience) =>
//                 experience.id === sectionId ? updatedExperience : experience
//               )
//             )
//           }
//         }

//         // validateBulletText(generatedBullet.text)
//       }
//     } catch (error) {
//       console.error('Error regenerating bullet', error)
//     } finally {
//       setRegeneratingBullet(null)
//     }
//   },
//   [
//     findExperience,
//     jobDescriptionAnalysis,
//     workExperience,
//     onSave,
//     settings.maxCharsPerBullet,
//     updateExperience,
//     editingBullet,
//   ]
// )
