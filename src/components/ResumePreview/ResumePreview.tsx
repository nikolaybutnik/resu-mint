'use client'

import { CreatePdfRequest } from '@/lib/types/api'
import styles from './ResumePreview.module.scss'
import React, { useEffect, useState, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { livePreviewService } from '@/lib/services/livePreviewService'
import { LIVE_PREVIEW } from '@/lib/constants'
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner'

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

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentRequestIdRef = useRef<number>(0)

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

    const requestId = ++currentRequestIdRef.current

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsDebouncing(true)
    setError(null)

    // Delay is shorter than the actual request debounce to update the UI faster
    debounceTimerRef.current = setTimeout(() => {
      // Only update state if this is still the current request
      if (requestId === currentRequestIdRef.current) {
        setIsDebouncing(false)
        setIsGenerating(true)
      }
    }, 300)

    try {
      const blob = await livePreviewService.generatePreview(resumeData, {
        debounceMs: LIVE_PREVIEW.DEBOUNCE_MS,
      })

      // Only update if we got a blob and we're still on the current request
      if (blob && requestId === currentRequestIdRef.current) {
        setPdfBlob(blob)
        setLastGenerated(new Date())
        setError(null)
      }
    } catch (err) {
      // Don't show cancellation errors to user - they're expected during rapid changes
      const isAbortError =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.message.includes('Request cancelled') ||
          err.message.includes('Request superseded') ||
          err.message.includes('signal is aborted'))

      // Only update error state if we're still on the current request
      if (!isAbortError && requestId === currentRequestIdRef.current) {
        console.error('Preview generation error:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to generate preview'
        )
      } else if (isAbortError) {
        console.info(
          'Request cancelled due to newer request. This is expected behavior.'
        )
      }
    } finally {
      // Only reset loading states if this request is still current
      // AND no newer request has started since this one began
      if (requestId === currentRequestIdRef.current) {
        setIsGenerating(false)
        setIsDebouncing(false)

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
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

  const renderHeaderStatus = () => {
    // Priority order: error > updating states > missing requirements > last updated
    if (error) {
      return (
        <div className={styles.statusIndicator} data-status='error'>
          <div className={styles.errorIcon}>⚠</div>
          <span>Error: {error}</span>
          <button onClick={generatePreview} className={styles.retryButtonSmall}>
            Retry
          </button>
        </div>
      )
    }

    if (isDebouncing || isGenerating) {
      return (
        <div className={styles.regeneratingIndicator}>
          <div className={styles.spinner}></div>
          <span>{isDebouncing ? 'Preparing...' : 'Updating...'}</span>
        </div>
      )
    }

    // Check specific requirements and provide targeted feedback
    if (!isDataValid && resumeData) {
      const personalDetails = resumeData.personalDetails
      const hasName = !!personalDetails?.name?.trim()
      const hasEmail = !!personalDetails?.email?.trim()
      const hasContent =
        resumeData.experienceSection?.some((exp) => exp.isIncluded) ||
        resumeData.projectSection?.some((proj) => proj.isIncluded)

      // Priority order for missing requirements
      if (!hasName) {
        return (
          <div className={styles.statusIndicator} data-status='info'>
            <span>Add your name to continue</span>
          </div>
        )
      }

      if (!hasEmail) {
        return (
          <div className={styles.statusIndicator} data-status='info'>
            <span>Add your email to continue</span>
          </div>
        )
      }

      if (!hasContent) {
        return (
          <div className={styles.statusIndicator} data-status='info'>
            <span>Add work experience or projects</span>
          </div>
        )
      }

      // If we have personal details and content but still invalid, must be job description
      return (
        <div className={styles.statusIndicator} data-status='info'>
          <span>Add job description to continue</span>
        </div>
      )
    }

    // Fallback for when no resumeData exists yet
    if (!isDataValid) {
      return (
        <div className={styles.statusIndicator} data-status='info'>
          <span>Complete your details to see preview</span>
        </div>
      )
    }

    if (lastGenerated) {
      return (
        <span className={styles.lastUpdated}>
          Updated {lastGenerated.toLocaleTimeString()}
        </span>
      )
    }

    return (
      <div className={styles.statusIndicator} data-status='info'>
        <span>Ready to generate</span>
      </div>
    )
  }

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <h2>Live Preview</h2>
        <div className={styles.headerRight}>{renderHeaderStatus()}</div>
      </div>

      <div className={styles.previewContent}>
        {pdfBlob && (
          <Document
            file={pdfBlob}
            options={options}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingSpinner size='lg' />}
          >
            {Array.from(new Array(numPages || 1), (_el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            ))}
          </Document>
        )}

        {!pdfBlob && !error && (
          <div className={styles.emptyState}>
            <h3>Resume Preview</h3>
            <p>
              {!isDataValid
                ? 'To generate your resume preview, please provide: your name, email, job description, and at least one work experience or project.'
                : 'Your resume will appear here once generated.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Preview
