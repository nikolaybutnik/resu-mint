import { ROUTES } from '@/lib/constants'
import { CreatePdfRequest } from '@/lib/types/api'

export const pdfService = {
  createPdf: async (params: CreatePdfRequest): Promise<Blob> => {
    try {
      const response = await fetch(ROUTES.CREATE_PDF, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to create PDF')
        } catch {
          throw new Error(`PDF creation failed: ${response.statusText}`)
        }
      }

      return await response.blob()
    } catch (error) {
      console.error('Error creating PDF:', error)
      throw new Error('Failed to create PDF')
    }
  },
}
