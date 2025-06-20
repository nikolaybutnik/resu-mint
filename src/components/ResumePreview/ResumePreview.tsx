'use client'

import { CreatePdfRequest } from '@/lib/types/api'
import styles from './ResumePreview.module.scss'
import React, { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { livePreviewService } from '@/lib/services/livePreviewService'

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
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setError('Failed to load PDF preview')
  }

  const generatePreview = async () => {
    if (!resumeData || !isDataValid) return

    setIsGenerating(true)
    setError(null)

    try {
      const blob = await livePreviewService.generatePreview(resumeData)
      setPdfBlob(blob)
    } catch (err) {
      console.error('Preview generation error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to generate preview'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    generatePreview()
  }, [resumeData, isDataValid])

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <h2>Live Preview</h2>
      </div>

      <div className={styles.previewContent}>
        {isGenerating && <p>Generating preview...</p>}
        {error && <p>Error: {error}</p>}

        {pdfBlob && (
          <Document
            file={pdfBlob}
            options={options}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<p>Loading PDF...</p>}
          >
            {Array.from(new Array(numPages || 1), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                // Performance optimizations
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            ))}
          </Document>
        )}

        {!pdfBlob && !isGenerating && !error && (
          <p>Your resume will appear here.</p>
        )}
      </div>
    </div>
  )
}

export default Preview
