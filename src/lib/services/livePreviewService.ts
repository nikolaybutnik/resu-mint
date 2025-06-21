import { CreatePdfRequest } from '@/lib/types/api'
import { LIVE_PREVIEW, ROUTES } from '@/lib/constants'
import { api, ResponseType } from '@/lib/services/api'

interface LivePreviewOptions {
  debounceMs?: number
}

interface CacheEntry {
  blob: Blob
  timestamp: number
  hash: string
}

interface QueuedRequest {
  hash: string
  data: CreatePdfRequest
  resolve: (blob: Blob) => void
  reject: (error: Error) => void
  timestamp: number
  abortController: AbortController
}

// SCALABILITY CONCERNS:
// - In-memory cache is lost on page reload
// - Tectonic can only handle one PDF at a time per server instance (no multi-threading)
// - CPU intensive, each compilation take 2-5 seconds of full CPU usage
// - Each compilation uses 100-200MB of RAM
// - Each browser stores its own PDF
// - Vercel functions has a 10s timeout
// - Vercel has a 512MB memory limit, multiple concurrent compilations will fail
// - Cold starts, first request will be slow (2-3 extra seconds)
// - Each function instance has isolated cache

export class LivePreviewService {
  private debounceTimer: NodeJS.Timeout | null = null
  private pendingPromise: {
    resolve: (blob: Blob) => void
    reject: (error: Error) => void
  } | null = null
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = LIVE_PREVIEW.CACHE_DURATION
  private readonly MAX_CACHE_SIZE = LIVE_PREVIEW.MAX_CACHE_SIZE

  // Queue management
  private requestQueue: QueuedRequest[] = []
  private currentRequest: QueuedRequest | null = null
  private isProcessing = false

  /**
   * Generate a deterministic hash from the resume data
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

    return Math.abs(hash).toString(16).padStart(8, '0')
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
   * Remove duplicate requests with same hash, keeping the most recent
   */
  private deduplicateQueue(): void {
    const hashMap = new Map<string, QueuedRequest>()

    this.requestQueue.forEach((request) => {
      const existing = hashMap.get(request.hash)
      if (!existing || request.timestamp > existing.timestamp) {
        if (existing) {
          existing.abortController.abort()
          existing.reject(new Error('Request superseded by newer request'))
        }
        hashMap.set(request.hash, request)
      } else {
        request.abortController.abort()
        request.reject(new Error('Request superseded by newer request'))
      }
    })

    this.requestQueue = Array.from(hashMap.values())
  }

  /**
   * Process the next request in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    try {
      this.deduplicateQueue()

      // FIFO - oldest request first
      this.requestQueue.sort((a, b) => a.timestamp - b.timestamp)

      const request = this.requestQueue.shift()!
      this.currentRequest = request

      console.info(
        `Processing PDF request (${this.requestQueue.length} remaining in queue)`
      )

      try {
        const blob = await this.generatePdfRequest(request)

        // Only resolve if request wasn't aborted
        if (!request.abortController.signal.aborted) {
          this.cache.set(request.hash, {
            blob,
            timestamp: Date.now(),
            hash: request.hash,
          })

          this.cleanCache()
          request.resolve(blob)
        }
      } catch (error) {
        // Only handle error if request wasn't aborted
        if (!request.abortController.signal.aborted) {
          console.error('PDF generation failed:', error)
          request.reject(error as Error)
        }
      }
    } finally {
      this.currentRequest = null
      this.isProcessing = false

      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100)
      }
    }
  }

  /**
   * Generate PDF request
   */
  private async generatePdfRequest(request: QueuedRequest): Promise<Blob> {
    const startTime = Date.now()

    try {
      const blob = await api.post<CreatePdfRequest, Blob>(
        ROUTES.CREATE_PDF,
        request.data,
        {
          signal: request.abortController.signal,
          responseType: ResponseType.BLOB,
        }
      )

      const duration = Date.now() - startTime
      console.info(`PDF generated in ${duration}ms`)

      return blob
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`PDF generation failed after ${duration}ms:`, error)
      throw error
    }
  }

  /**
   * Generate a preview of the resume
   */
  async generatePreview(
    data: CreatePdfRequest,
    options: LivePreviewOptions = {}
  ): Promise<Blob> {
    const { debounceMs = LIVE_PREVIEW.DEBOUNCE_MS } = options
    const hash = this.generateHash(data)

    // Check cache first
    const cached = this.cache.get(hash)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.info('Using cached PDF preview')
      return cached.blob
    }

    return new Promise((resolve, reject) => {
      // Cancel previous pending promise if exists
      if (this.pendingPromise) {
        this.pendingPromise.reject(
          new Error('Request superseded by newer request')
        )
      }

      // Clear existing debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      // Store the current promise resolvers
      this.pendingPromise = { resolve, reject }

      // Set up debounced queueing
      this.debounceTimer = setTimeout(() => {
        // Clear the pending promise reference since we're about to queue it
        this.pendingPromise = null

        const queuedRequest: QueuedRequest = {
          hash,
          data,
          resolve,
          reject,
          timestamp: Date.now(),
          abortController: new AbortController(),
        }

        this.requestQueue.push(queuedRequest)
        console.info(
          `Queued PDF request (queue size: ${this.requestQueue.length})`
        )

        this.processQueue()
      }, debounceMs)
    })
  }

  /**
   * Get basic stats for debugging
   */
  getStats(): {
    queueSize: number
    isProcessing: boolean
    cacheSize: number
  } {
    return {
      queueSize: this.requestQueue.length,
      isProcessing: this.isProcessing,
      cacheSize: this.cache.size,
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelPending(): void {
    // Cancel pending debounced promise
    if (this.pendingPromise) {
      this.pendingPromise.reject(new Error('Request cancelled'))
      this.pendingPromise = null
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Cancel all queued requests
    this.requestQueue.forEach((request) => {
      request.abortController.abort()
      request.reject(new Error('Request cancelled'))
    })
    this.requestQueue = []

    // Cancel current request
    if (this.currentRequest) {
      this.currentRequest.abortController.abort()
      this.currentRequest.reject(new Error('Request cancelled'))
      this.currentRequest = null
    }

    this.isProcessing = false
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    console.info('PDF cache cleared')
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
