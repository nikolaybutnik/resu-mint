import { api } from './api'
import { ROUTES } from '@/lib/constants'
import { JobDescriptionAnalysis } from '@/lib/types/api'
import { BulletPoint } from '@/lib/types/projects'
import { sanitizeResumeBullet } from '@/lib/utils'

export interface GenerateBulletParams {
  sectionType: 'project' | 'experience'
  sectionDescription: string
  existingBullets: BulletPoint[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  maxCharsPerBullet: number
  numBullets?: number
}

export const bulletService = {
  generateBullets: async (params: GenerateBulletParams): Promise<string[]> => {
    const payload = {
      section: {
        type: params.sectionType,
        description: params.sectionDescription,
      },
      existingBullets: params.existingBullets,
      jobDescriptionAnalysis: params.jobDescriptionAnalysis,
      numBullets: params.numBullets || 1,
      maxCharsPerBullet: params.maxCharsPerBullet,
    }

    try {
      const result = await api.post(ROUTES.GENERATE_BULLETS, payload)
      return result.map((text: string) => sanitizeResumeBullet(text, true))
    } catch (error) {
      console.error('Error generating bullet:', error)
      throw error
    }
  },
}
