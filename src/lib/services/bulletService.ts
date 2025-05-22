import { api } from './api'
import { ROUTES } from '@/lib/constants'
import {
  GenerateBulletsRequest,
  GenerateBulletsResponse,
} from '@/lib/types/api'
import { sanitizeResumeBullet } from '@/lib/utils'
import { BulletPoint } from '../types/experience'

export const bulletService = {
  generateBullets: async (
    params: GenerateBulletsRequest
  ): Promise<GenerateBulletsResponse[]> => {
    try {
      const result = await api.post(ROUTES.GENERATE_BULLETS, params)
      return result.map((item: GenerateBulletsResponse) => ({
        sectionId: item.sectionId,
        bullets: item.bullets.map((bullet: BulletPoint) =>
          sanitizeResumeBullet(bullet.text, true)
        ),
      }))
    } catch (error) {
      console.error('Error generating bullets:', error)
      throw new Error('Failed to generate bullets')
    }
  },
}
