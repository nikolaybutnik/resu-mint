import { CreatePdfRequest } from '@/lib/types/api'
import { LIVE_PREVIEW, API_ROUTES } from '@/lib/constants'
import { api, ResponseType } from '@/lib/services/api'
import { omit } from 'lodash'

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

export class LivePreviewService {
  private debounceTimer: NodeJS.Timeout | null = null
  private pendingPromise: {
    resolve: (blob: Blob) => void
    reject: (error: Error) => void
  } | null = null
  private memCache = new Map<string, CacheEntry>()
  private readonly cacheDuration = LIVE_PREVIEW.CACHE_DURATION
  private readonly localStorageDuration = LIVE_PREVIEW.LOCALSTORAGE_DURATION
  private readonly maxCacheSize = LIVE_PREVIEW.MAX_CACHE_SIZE
  private readonly maxBlobSizeForStorage =
    LIVE_PREVIEW.MAX_BLOB_SIZE_FOR_STORAGE
  private readonly maxLocalStorageItems = LIVE_PREVIEW.MAX_LOCALSTORAGE_ITEMS

  // Queue management
  private requestQueue: QueuedRequest[] = []
  private currentRequest: QueuedRequest | null = null
  private isProcessing = false

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.forceCancel()
      })
    }
  }

  /**
   * Generate a deterministic hash from the resume data
   */
  private generateHash(data: CreatePdfRequest): string {
    const hashData = {
      personal: omit(data.personalDetails, ['updatedAt']),
      experience: data.experienceSection
        .filter((exp) => exp.isIncluded)
        .map((exp) => ({
          id: exp.id,
          title: exp.title,
          company: exp.companyName,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          bulletPoints: exp.bulletPoints?.map((b) => b.text),
          isIncluded: exp.isIncluded,
        })),
      projects: data.projectSection
        .filter((proj) => proj.isIncluded)
        .map((proj) => ({
          id: proj.id,
          title: proj.title,
          startDate: proj.startDate,
          endDate: proj.endDate,
          technologies: proj.technologies,
          link: proj.link,
          bulletPoints: proj.bulletPoints.map((b) => b.text),
          isIncluded: proj.isIncluded,
        })),
      education: data.educationSection
        .filter((edu) => edu.isIncluded)
        .map((edu) => ({
          id: edu.id,
          institution: edu.institution,
          location: edu.location,
          degree: edu.degree,
          isIncluded: edu.isIncluded,
        })),
      skills: data.skillsSection
        .filter((skill) => skill.skills.length > 0)
        .filter((skill) => skill.isIncluded)
        .map((skill) => ({
          id: skill.id,
          title: skill.title,
          skills: skill.skills,
        })),
      order: data.settings.sectionOrder,
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
   * Check localStorage for cached blob
   */
  private async getFromLocalStorage(hash: string): Promise<Blob | null> {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(`pdf-${hash}`)
      if (!stored) return null

      const { base64Data, timestamp, mimeType } = JSON.parse(stored)

      if (Date.now() - timestamp > this.localStorageDuration) {
        localStorage.removeItem(`pdf-${hash}`)
        return null
      }

      // Convert base64 back to blob
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      return new Blob([byteArray], { type: mimeType })
    } catch (error) {
      console.warn('Failed to retrieve from localStorage:', error)
      return null
    }
  }

  /**
   * Save blob to localStorage if small enough
   */
  private async saveToLocalStorage(hash: string, blob: Blob): Promise<void> {
    if (typeof window === 'undefined') return

    if (blob.size > this.maxBlobSizeForStorage) {
      const wouldBeEncodedSize = Math.round(blob.size * 1.33)
      console.info(
        `PDF too large (${blob.size} bytes, would be ~${wouldBeEncodedSize} bytes encoded) for localStorage - using memory cache only`
      )
      return
    }

    try {
      // Convert blob to base64
      const arrayBuffer = await blob.arrayBuffer()
      const base64Data = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      )

      const storageData = {
        base64Data,
        timestamp: Date.now(),
        mimeType: blob.type,
        size: blob.size,
      }

      // Clean old entries before adding new one
      this.cleanLocalStorageCache()

      const encodedSize = JSON.stringify(storageData).length
      localStorage.setItem(`pdf-${hash}`, JSON.stringify(storageData))
      console.info(
        `Saved PDF to localStorage: ${blob.size} bytes → ${encodedSize} bytes encoded`
      )
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  /**
   * Clean old localStorage entries
   */
  private cleanLocalStorageCache(): void {
    if (typeof window === 'undefined') return

    try {
      const pdfKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('pdf-')
      )

      // First, remove expired entries
      const now = Date.now()
      const validEntries: { key: string; timestamp: number }[] = []

      pdfKeys.forEach((key) => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          const timestamp = data.timestamp || 0

          if (now - timestamp > this.localStorageDuration) {
            localStorage.removeItem(key)
            console.info(`Removed expired PDF from localStorage: ${key}`)
          } else {
            validEntries.push({ key, timestamp })
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key)
          console.info(`Removed corrupted PDF from localStorage: ${key}`)
        }
      })

      // Then, if still too many valid entries, remove oldest ones
      if (validEntries.length >= this.maxLocalStorageItems) {
        const sortedEntries = validEntries.sort(
          (a, b) => a.timestamp - b.timestamp
        )
        const toRemove = sortedEntries.slice(
          0,
          sortedEntries.length - this.maxLocalStorageItems + 1
        )

        toRemove.forEach((entry) => {
          localStorage.removeItem(entry.key)
          console.info(`Removed old PDF from localStorage: ${entry.key}`)
        })
      }
    } catch (error) {
      console.warn('Failed to clean localStorage cache:', error)
    }
  }

  /**
   * Clean the cache of expired and over-sized entries
   */
  private cleanCache(): void {
    const now = Date.now()
    const entries = Array.from(this.memCache.entries())

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.cacheDuration) {
        this.memCache.delete(key)
      }
    })

    // If still too many, remove oldest
    if (this.memCache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.memCache.size - this.maxCacheSize)

      sortedEntries.forEach(([key]) => this.memCache.delete(key))
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
          // Cache in memory
          this.memCache.set(request.hash, {
            blob,
            timestamp: Date.now(),
            hash: request.hash,
          })

          // Try to cache in localStorage if small enough
          await this.saveToLocalStorage(request.hash, blob)

          this.cleanCache()
          request.resolve(blob)
        } else {
          console.debug(
            'Request completed but was aborted - not caching result'
          )
        }
      } catch (error) {
        // Only handle error if request wasn't aborted
        if (!request.abortController.signal.aborted) {
          console.error('PDF generation failed:', error)
          request.reject(error as Error)
        } else {
          // Request was aborted - this is expected during rapid changes
          console.debug('PDF request aborted (expected during rapid changes)')
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
        API_ROUTES.CREATE_PDF,
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

    // 1. Check in-memory cache first (fastest)
    const cached = this.memCache.get(hash)
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.info('Using in-memory cached PDF')
      return cached.blob
    }

    // 2. Check localStorage (slower but still fast)
    const localBlob = await this.getFromLocalStorage(hash)
    if (localBlob) {
      console.info('Using localStorage cached PDF')

      // Add back to memory cache for faster future access
      this.memCache.set(hash, {
        blob: localBlob,
        timestamp: Date.now(),
        hash,
      })

      return localBlob
    }

    // 3. Generate new PDF
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
    memoryCacheSize: number
    localStorageCacheSize: number
    localStorageUsageMB: number
  } {
    if (typeof window === 'undefined') {
      return {
        queueSize: this.requestQueue.length,
        isProcessing: this.isProcessing,
        memoryCacheSize: this.memCache.size,
        localStorageCacheSize: 0,
        localStorageUsageMB: 0,
      }
    }

    const pdfKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('pdf-')
    )
    const localStorageUsage = pdfKeys.reduce((total, key) => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        return total + (data.size || 0)
      } catch {
        return total
      }
    }, 0)

    return {
      queueSize: this.requestQueue.length,
      isProcessing: this.isProcessing,
      memoryCacheSize: this.memCache.size,
      localStorageCacheSize: pdfKeys.length,
      localStorageUsageMB: localStorageUsage / (1024 * 1024),
    }
  }

  /**
   * Cancel all pending requests (but allow current request to finish)
   */
  cancelPending(): void {
    // Cancel pending debounced promise
    if (this.pendingPromise) {
      this.pendingPromise.reject(
        new Error('Request cancelled - newer request pending')
      )
      this.pendingPromise = null
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Cancel all queued requests (but not the currently processing one)
    this.requestQueue.forEach((request) => {
      request.abortController.abort()
      request.reject(
        new Error('Request cancelled - component unmounting or data changed')
      )
    })
    this.requestQueue = []

    // Don't cancel the current request - let it finish naturally
    // This prevents the AbortError when rapid changes occur
    console.debug(
      'Cancelled pending requests, allowing current request to complete'
    )
  }

  /**
   * Force cancel ALL requests including currently processing one (for cleanup)
   */
  forceCancel(): void {
    this.cancelPending()

    // Also cancel current request for complete cleanup
    if (this.currentRequest) {
      this.currentRequest.abortController.abort()
      this.currentRequest.reject(new Error('Request cancelled - force cleanup'))
      this.currentRequest = null
    }

    this.isProcessing = false
  }

  /**
   * Clear both memory and localStorage cache
   */
  clearAllCache(): void {
    this.memCache.clear()

    if (typeof window !== 'undefined') {
      const pdfKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('pdf-')
      )
      pdfKeys.forEach((key) => localStorage.removeItem(key))
    }

    console.info('PDF cache cleared (memory and localStorage)')
  }
}

export const livePreviewService = new LivePreviewService()
