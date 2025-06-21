'use client'

import { CreatePdfRequest } from '@/lib/types/api'
import styles from './ResumePreview.module.scss'
import React, { useEffect, useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { livePreviewService } from '@/lib/services/livePreviewService'
import { LIVE_PREVIEW } from '@/lib/constants'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// Add cMap and standard font options for better compatibility
const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
}

interface ResumePreviewProps {
  resumeData: CreatePdfRequest | null
  isDataValid: boolean
}

const Preview: React.FC<ResumePreviewProps> = ({ resumeData, isDataValid }) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)

  // Track debounce timer for UI feedback
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setError('Failed to load PDF preview')
  }

  const generatePreview = async () => {
    if (!resumeData || !isDataValid) {
      setPdfBlob(null)
      setError(null)
      return
    }

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Show debouncing state
    setIsDebouncing(true)
    setError(null)

    // Set up debounce timer for UI feedback
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false)
      setIsGenerating(true)
    }, LIVE_PREVIEW.DEBOUNCE_MS)

    try {
      const blob = await livePreviewService.generatePreview(resumeData, {
        debounceMs: LIVE_PREVIEW.DEBOUNCE_MS,
      })

      // Only update if we got a blob (request wasn't cancelled)
      if (blob) {
        setPdfBlob(blob)
        setLastGenerated(new Date())
        setError(null)
      }
    } catch (err) {
      console.error('Preview generation error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to generate preview'
      )
    } finally {
      setIsGenerating(false)
      setIsDebouncing(false)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }

  // Auto-generate when data changes
  useEffect(() => {
    generatePreview()

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      livePreviewService.cancelPending()
    }
  }, [resumeData, isDataValid])

  // Show appropriate loading state
  const getLoadingMessage = () => {
    if (isDebouncing) return 'Preparing to generate...'
    if (isGenerating) return 'Generating preview...'
    return 'Loading PDF...'
  }

  // Show data validity message
  if (!isDataValid) {
    return (
      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <h2>Live Preview</h2>
        </div>
        <div className={styles.previewContent}>
          <div className={styles.emptyState}>
            <h3>Preview Not Available</h3>
            <p>
              Please fill in your personal details and add some experience or
              projects to see a preview.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <h2>Live Preview</h2>
        <div className={styles.headerRight}>
          {(isDebouncing || isGenerating) && (
            <div className={styles.regeneratingIndicator}>
              <div className={styles.spinner}></div>
              <span>Updating...</span>
            </div>
          )}
          {lastGenerated && !isDebouncing && !isGenerating && (
            <span className={styles.lastUpdated}>
              Updated {lastGenerated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className={styles.previewContent}>
        {(isDebouncing || isGenerating) && (
          <div className={styles.loadingState}>
            <p>{getLoadingMessage()}</p>
            {isDebouncing && (
              <div className={styles.debounceIndicator}>
                <div className={styles.debounceBar}></div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <p>Error: {error}</p>
            <button onClick={generatePreview} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        )}

        {pdfBlob && (
          <Document
            file={pdfBlob}
            options={options}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<p>{getLoadingMessage()}</p>}
          >
            {Array.from(new Array(numPages || 1), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            ))}
          </Document>
        )}

        {!pdfBlob && !isDebouncing && !isGenerating && !error && (
          <div className={styles.emptyState}>
            <p>Your resume will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Preview
