import { CreatePdfRequest } from '@/lib/types/api'
import { ROUTES } from '@/lib/constants'

export class LivePreviewService {
  async generatePreview(data: CreatePdfRequest): Promise<Blob> {
    // Uses existing Tectonic endpoint
    const response = await fetch(ROUTES.CREATE_PDF, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`)
    }

    return await response.blob()
  }
}

export const livePreviewService = new LivePreviewService()
