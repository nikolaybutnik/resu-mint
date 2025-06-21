import { CreatePdfRequest } from '@/lib/types/api'
import { ROUTES } from '@/lib/constants'

export interface LivePreviewOptions {
  debounceMs?: number
  maxRetries?: number
  priority?: 'low' | 'normal' | 'high'
}

interface CacheEntry {
  blob: Blob
  timestamp: number
  hash: string
}

// SCALABILITY CONCERNS:
// - In-memory cache is lost on page reload
// - Tectonic can only handle one PDF at a time per server instance (no multi-threading)
// - CPU intensive, each compilation take 2-5 seconds of full CPU usage
// - Each compilation uses 100-200MB of RAM
// - No queueing, concurrent requests will fail or timeout
// - Each browser stores its own PDF
// - Vercel functions has a 10s timeout
// - Vercel has a 512MB memory limit, multiple concurrent compilations will fail
// - Cold starts, first request will be slow (2-3 extra seconds)
// - Each function instance has isolated cache

export class LivePreviewService {
  private debounceTimer: NodeJS.Timeout | null = null
  private currentRequest: AbortController | null = null
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 10 * 60 * 1000 // 10 minutes
  private readonly MAX_CACHE_SIZE = 20 // Keep last 20 PDFs

  /**
   * Generate a deterministic hash from the resume data
   * @param data - The resume data to hash
   * @returns A hash of the resume data
   */
  private generateHash(data: CreatePdfRequest): string {
    const hashData = {
      personal: data.personalDetails,
      experience: data.experienceSection.map((exp) => ({
        id: exp.id,
        title: exp.title,
        company: exp.companyName,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        bulletPoints: exp.bulletPoints.map((b) => b.text),
        isIncluded: exp.isIncluded,
      })),
      projects: data.projectSection.map((proj) => ({
        id: proj.id,
        title: proj.title,
        startDate: proj.startDate,
        endDate: proj.endDate,
        technologies: proj.technologies,
        link: proj.link,
        bulletPoints: proj.bulletPoints.map((b) => b.text),
        isIncluded: proj.isIncluded,
      })),
      education: data.educationSection.map((edu) => ({
        id: edu.id,
        institution: edu.institution,
        location: edu.location,
        degree: edu.degree,
        isIncluded: edu.isIncluded,
      })),
    }

    const jsonString = JSON.stringify(hashData)

    let hash = 0
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    const hashString = Math.abs(hash).toString(16).padStart(8, '0')

    return hashString
  }

  /**
   * Clean the cache of expired and over-sized entries
   */
  private cleanCache(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key)
      }
    })

    // If still too many, remove oldest
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.MAX_CACHE_SIZE)

      sortedEntries.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * Generate a preview of the resume
   * @param data - The resume data to generate a preview for
   * @returns A blob of the preview
   */
  async generatePreview(
    data: CreatePdfRequest,
    options: LivePreviewOptions = {}
  ): Promise<Blob> {
    // TODO: Implement priority queueing and retry logic
    // const { debounceMs = 1500, maxRetries = 2, priority = 'normal' } = options
    const { debounceMs = 1500 } = options
    const hash = this.generateHash(data)

    const cached = this.cache.get(hash)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.info('Using cached PDF preview')
      return cached.blob
    }

    // Cancel any existing request
    if (this.currentRequest) {
      console.info('Canceling previous PDF generation')
      this.currentRequest.abort()
    }

    this.currentRequest = new AbortController()

    return new Promise((resolve, reject) => {
      // Clear existing debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      // Set up debounced compilation
      this.debounceTimer = setTimeout(async () => {
        console.info('Starting PDF generation...')
        const startTime = Date.now()

        try {
          const response = await fetch(ROUTES.CREATE_PDF, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: this.currentRequest!.signal,
          })

          if (!response.ok) {
            throw new Error(`PDF generation failed: ${response.statusText}`)
          }

          const blob = await response.blob()
          const duration = Date.now() - startTime
          console.info(`PDF generated in ${duration}ms`)

          // Cache the result
          this.cache.set(hash, {
            blob,
            timestamp: Date.now(),
            hash,
          })

          // Clean up old cache entries
          this.cleanCache()

          resolve(blob)
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.info('PDF generation was cancelled')
            // Don't reject on abort - this is expected behavior
            return
          }

          console.error('PDF generation failed:', error)
          reject(error)
        } finally {
          this.currentRequest = null
        }
      }, debounceMs)
    })
  }

  /**
   * Get the cache statistics for debugging
   * @returns The cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    console.info('PDF cache cleared')
  }

  /**
   * Cancel any pending PDF generation
   */
  cancelPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.currentRequest) {
      this.currentRequest.abort()
      this.currentRequest = null
    }
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    this.cancelPending()
    this.clearCache()
  }
}

export const livePreviewService = new LivePreviewService()
