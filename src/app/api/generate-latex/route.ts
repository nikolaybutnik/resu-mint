import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getResumeTemplate } from '@/lib/resume-template'
import {
  zodErrorsToApiErrors,
  createError,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/types/errors'
import { writeFile, access, unlink, stat, readdir, readFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { pdfStore } from '@/lib/pdfStore'

const execPromise = promisify(exec)

const latexSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  phone: z.string().min(1, 'Phone is required'),
  generatedSections: z
    .array(
      z.record(z.string().min(1, 'Job title is required'), z.array(z.string()))
    )
    .min(1, 'At least one section is required'),
})

type LatexFields = z.infer<typeof latexSchema>

async function cleanupOldFiles(sessionId: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping cleanup in development mode for debugging')
    return
  }

  try {
    const tempDir = tmpdir()
    const files = await readdir(tempDir)
    const resumeFiles = files.filter(
      (file) =>
        file.startsWith(`resume-${sessionId}-`) &&
        (file.endsWith('.tex') || file.endsWith('.pdf'))
    )
    const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
    const now = Date.now()
    let totalSize = 0

    await Promise.all(
      resumeFiles.map(async (file) => {
        try {
          const filePath = join(tempDir, file)
          const stats = await stat(filePath)
          if (now - stats.mtimeMs > MAX_AGE_MS) {
            totalSize += stats.size
            await unlink(filePath)
          }
        } catch (error) {
          console.warn('Failed to delete:', file, error)
        }
      })
    )
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = latexSchema.safeParse(body)

    if (!result.success) {
      const errors = zodErrorsToApiErrors(result.error.issues)
      return NextResponse.json(createErrorResponse(errors), { status: 400 })
    }

    const { sessionId, name, email, phone, generatedSections } =
      result.data as LatexFields

    // Cleanup old files for this session
    await cleanupOldFiles(sessionId)

    const latexContent = getResumeTemplate(
      name,
      email,
      phone,
      generatedSections
    )
    const fileId = uuidv4()
    const texFilePath = join(tmpdir(), `resume-${sessionId}-${fileId}.tex`)
    const pdfFilePath = join(tmpdir(), `resume-${sessionId}-${fileId}.pdf`)

    // Write .tex file
    try {
      await writeFile(texFilePath, latexContent)
    } catch (writeError) {
      console.error('Write error:', writeError)
      return NextResponse.json(
        createErrorResponse([
          {
            field: 'server',
            message: 'Failed to write LaTeX file',
          },
        ]),
        { status: 500 }
      )
    }

    // Compile .tex to .pdf and verify
    try {
      await execPromise(`tectonic ${texFilePath} -o ${tmpdir()}`)
      await access(pdfFilePath)
    } catch (tectonicError) {
      console.error('Tectonic error:', tectonicError)
      return NextResponse.json(
        createErrorResponse([
          {
            field: 'server',
            message: 'Failed to compile LaTeX to PDF',
          },
        ]),
        { status: 500 }
      )
    }

    // Store PDF in memory for Vercel fallback
    if (process.env.VERCEL) {
      try {
        const pdfBuffer = await readFile(pdfFilePath)
        pdfStore.set(`${sessionId}-${fileId}`, pdfBuffer)
        console.log('Stored PDF in memory for:', `${sessionId}-${fileId}`)
      } catch (error) {
        console.error('Failed to read PDF for storage:', error)
      }
    }

    return NextResponse.json(createSuccessResponse({ fileId }), {
      status: 200,
    })
  } catch (error) {
    const serverError = createError(
      'server',
      'Failed to generate latex template',
      'latex_generation'
    )
    return NextResponse.json(createErrorResponse([serverError]), {
      status: 500,
    })
  }
}
