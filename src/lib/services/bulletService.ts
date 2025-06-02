import { api } from './api'
import { ROUTES } from '@/lib/constants'
import {
  GenerateBulletsRequest,
  GenerateBulletsResponse,
} from '@/lib/types/api'
import { sanitizeResumeBullet } from '@/lib/utils'

export const bulletService = {
  generateBullets: async (
    params: GenerateBulletsRequest
  ): Promise<GenerateBulletsResponse[]> => {
    try {
      const result = await api.post(ROUTES.GENERATE_BULLETS, params)
      return result.map((item: GenerateBulletsResponse) => ({
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
}
