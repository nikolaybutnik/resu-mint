'use client'

import { CreatePdfRequest } from '@/lib/types/api'
import styles from './ResumePreview.module.scss'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { livePreviewService } from '@/lib/services/livePreviewService'
import { LIVE_PREVIEW } from '@/lib/constants'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import {
  FiDownload,
  FiZoomIn,
  FiZoomOut,
  FiMaximize2,
  FiChevronLeft,
  FiChevronRight,
  FiSliders,
} from 'react-icons/fi'
import saveAs from 'file-saver'
import type { DocumentProps, PageProps } from 'react-pdf'

interface PdfOptions {
  cMapUrl: string
  standardFontDataUrl: string
}

interface PdfComponents {
  Document: React.ComponentType<DocumentProps>
  Page: React.ComponentType<PageProps>
  pdfjs: typeof import('pdfjs-dist')
  options: PdfOptions
}

const initializePdfjs = async (): Promise<PdfComponents> => {
  try {
    const {
      pdfjs: pdfjsLib,
      Document: DocumentComponent,
      Page: PageComponent,
    } = await import('react-pdf')

    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

    const pdfOptions: PdfOptions = {
      cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    }

    return {
      pdfjs: pdfjsLib,
      Document: DocumentComponent,
      Page: PageComponent,
      options: pdfOptions,
    }
  } catch (error) {
    console.error('Failed to initialize PDF.js:', error)
    throw new Error('PDF viewer is not supported in this browser')
  }
}

interface ResumePreviewProps {
  resumeData: CreatePdfRequest | null
  isDataValid: boolean
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const DEFAULT_ZOOM = 1
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3

const Preview: React.FC<ResumePreviewProps> = ({ resumeData, isDataValid }) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM)
  const [fitToWidth, setFitToWidth] = useState<boolean>(false)
  const [showZoomSlider, setShowZoomSlider] = useState<boolean>(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [pdfjsReady, setPdfjsReady] = useState(false)
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentRequestIdRef = useRef<number>(0)
  const previewContentRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const components = await initializePdfjs()
        setPdfComponents(components)
        setPdfjsReady(true)
      } catch (err) {
        console.error('PDF.js initialization failed:', err)
        setError('PDF viewer is not supported in this browser')
      }
    }

    init()
  }, [])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages)
  }

  const onDocumentLoadError = (error: Error): void => {
    console.error('PDF load error:', error)
    setError('Failed to load PDF preview')
  }

  const handleDownload = (): void => {
    if (pdfBlob) {
      const fileName = `${
        resumeData?.personalDetails?.name?.replace(/\s+/g, '_') || 'resume'
      }_${new Date().toISOString().split('T')[0]}.pdf`
      saveAs(pdfBlob, fileName)
    }
  }

  const handleZoomIn = (): void => {
    if (fitToWidth) {
      const closestIndex = ZOOM_LEVELS.findIndex((level) => level > zoom)
      const targetIndex = Math.min(
        closestIndex >= 0 ? closestIndex : ZOOM_LEVELS.length - 1,
        ZOOM_LEVELS.length - 1
      )
      setZoom(ZOOM_LEVELS[targetIndex])
      setFitToWidth(false)
    } else {
      const currentIndex = ZOOM_LEVELS.findIndex((level) => level >= zoom)
      const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1)
      setZoom(ZOOM_LEVELS[nextIndex])
    }
  }

  const handleZoomOut = (): void => {
    if (fitToWidth) {
      const closestIndex = ZOOM_LEVELS.findIndex((level) => level > zoom)
      const targetIndex = Math.max(
        (closestIndex > 0 ? closestIndex : ZOOM_LEVELS.length) - 1,
        0
      )
      setZoom(ZOOM_LEVELS[targetIndex])
      setFitToWidth(false)
    } else {
      const currentIndex = ZOOM_LEVELS.findIndex((level) => level >= zoom)
      const prevIndex = Math.max(currentIndex - 1, 0)
      setZoom(ZOOM_LEVELS[prevIndex])
    }
  }

  const handleZoomSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newZoom = parseFloat(e.target.value)
    setZoom(newZoom)
    setFitToWidth(false)
  }

  const calculateFitToWidthZoom = useCallback((): number => {
    if (!previewContentRef.current) return DEFAULT_ZOOM

    const availableWidth = previewContentRef.current.clientWidth

    const pdfCanvas = previewContentRef.current.querySelector('canvas')
    if (pdfCanvas) {
      const currentPageWidth = pdfCanvas.width / window.devicePixelRatio / zoom
      const calculatedZoom = availableWidth / currentPageWidth
      return Math.max(MIN_ZOOM, Math.min(calculatedZoom, MAX_ZOOM))
    }

    const standardPageWidth = 8.5 * 96
    const calculatedZoom = availableWidth / standardPageWidth
    return Math.max(MIN_ZOOM, Math.min(calculatedZoom, MAX_ZOOM))
  }, [zoom])

  const handleFitToWidth = (): void => {
    if (fitToWidth) {
      setFitToWidth(false)
      setZoom(DEFAULT_ZOOM)
    } else {
      setFitToWidth(true)
      const calculatedZoom = calculateFitToWidthZoom()
      setZoom(calculatedZoom)
    }
  }

  const handlePreviousPage = (): void => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = (): void => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages || 1))
  }

  const getZoomDisplayText = (): string => {
    if (fitToWidth) {
      return 'Fit'
    }
    return `${Math.round(zoom * 100)}%`
  }

  const generatePreview = async (): Promise<void> => {
    if (!resumeData || !isDataValid) {
      setPdfBlob(null)
      setError(null)
      return
    }

    const requestId = ++currentRequestIdRef.current

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsDebouncing(true)
    setError(null)

    debounceTimerRef.current = setTimeout(() => {
      if (requestId === currentRequestIdRef.current) {
        setIsDebouncing(false)
        setIsGenerating(true)
      }
    }, 300)

    try {
      const blob = await livePreviewService.generatePreview(resumeData, {
        debounceMs: LIVE_PREVIEW.DEBOUNCE_MS,
      })

      if (blob && requestId === currentRequestIdRef.current) {
        setPdfBlob(blob)
        setLastGenerated(new Date())
        setError(null)
      }
    } catch (err) {
      const isAbortError =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.message.includes('Request cancelled') ||
          err.message.includes('Request superseded') ||
          err.message.includes('signal is aborted'))

      if (!isAbortError && requestId === currentRequestIdRef.current) {
        console.error('Preview generation error:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to generate preview'
        )
      }
    } finally {
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

  useEffect(() => {
    generatePreview()

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      livePreviewService.cancelPending()
    }
  }, [resumeData, isDataValid])

  const renderHeaderStatus = (): React.ReactElement => {
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

    if (!isDataValid && resumeData) {
      const personalDetails = resumeData.personalDetails
      const hasName = !!personalDetails?.name?.trim()
      const hasEmail = !!personalDetails?.email?.trim()
      const hasContent =
        resumeData.experienceSection?.some((exp) => exp.isIncluded) ||
        resumeData.projectSection?.some((proj) => proj.isIncluded)

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

      return (
        <div className={styles.statusIndicator} data-status='info'>
          <span>Add job description to continue</span>
        </div>
      )
    }

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

  const renderPdfControls = (): React.ReactElement | null => {
    if (!pdfBlob || error || !pdfjsReady) return null

    return (
      <div className={styles.pdfControls}>
        <div className={styles.controlGroup}>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className={styles.controlButton}
            title='Zoom Out'
          >
            <FiZoomOut />
          </button>

          <div className={styles.zoomControls}>
            <span className={styles.zoomLevel}>{getZoomDisplayText()}</span>
            <button
              onClick={() => setShowZoomSlider(!showZoomSlider)}
              className={`${styles.controlButton} ${styles.sliderToggle} ${
                showZoomSlider ? styles.active : ''
              }`}
              title='Toggle Zoom Slider'
            >
              <FiSliders />
            </button>
          </div>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className={styles.controlButton}
            title='Zoom In'
          >
            <FiZoomIn />
          </button>

          <button
            onClick={handleFitToWidth}
            className={`${styles.controlButton} ${
              fitToWidth ? styles.active : ''
            }`}
            title='Fit to Width'
          >
            <FiMaximize2 />
          </button>
        </div>

        {showZoomSlider && (
          <div className={styles.zoomSliderContainer}>
            <input
              type='range'
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.1}
              value={zoom}
              onChange={handleZoomSliderChange}
              className={styles.zoomSlider}
            />
            <div className={styles.zoomSliderLabels}>
              <span>{Math.round(MIN_ZOOM * 100)}%</span>
              <span>{Math.round(MAX_ZOOM * 100)}%</span>
            </div>
          </div>
        )}

        {numPages && numPages > 1 && (
          <div className={styles.controlGroup}>
            <button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
              className={styles.controlButton}
              title='Previous Page'
            >
              <FiChevronLeft />
            </button>
            <span className={styles.pageInfo}>
              {currentPage} of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className={styles.controlButton}
              title='Next Page'
            >
              <FiChevronRight />
            </button>
          </div>
        )}

        <div className={styles.controlGroup}>
          <button
            onClick={handleDownload}
            className={`${styles.controlButton} ${styles.downloadButton}`}
            title='Download PDF'
          >
            <FiDownload />
            <span>Download</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <h2>Live Preview</h2>
        <div className={styles.headerRight}>{renderHeaderStatus()}</div>
      </div>

      {renderPdfControls()}

      <div className={styles.previewContent} ref={previewContentRef}>
        {pdfBlob && pdfjsReady && pdfComponents && (
          <div
            className={`${styles.pdfContainer} ${
              fitToWidth ? styles.fitToWidth : ''
            }`}
            ref={pdfContainerRef}
          >
            <pdfComponents.Document
              file={pdfBlob}
              options={pdfComponents.options}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <LoadingSpinner size='lg' text='Loading PDF viewer...' />
              }
            >
              <pdfComponents.Page
                key={`page_${currentPage}`}
                pageNumber={currentPage}
                scale={zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </pdfComponents.Document>
          </div>
        )}

        {!pdfjsReady && !error && (
          <div className={styles.emptyState}>
            <LoadingSpinner size='lg' text='Loading PDF viewer...' />
          </div>
        )}

        {!pdfBlob && !error && pdfjsReady && (
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
