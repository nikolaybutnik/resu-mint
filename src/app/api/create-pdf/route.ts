import { NextRequest, NextResponse } from 'next/server'
import { createError, createErrorResponse } from '@/lib/types/errors'
import { createPdfRequestSchema } from '@/lib/validationSchemas'
import { CreatePdfRequest } from '@/lib/types/api'
import { generateLatex } from '@/lib/template/generateLatex'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'

// Use project-specific tectonic binary
const TECTONIC_PATH = path.join(process.cwd(), 'bin', 'tectonic')

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()

    const validationResult = createPdfRequestSchema.safeParse(rawData)
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([createError('client', 'Invalid request data')]),
        { status: 400 }
      )
    }

    const data = validationResult.data as CreatePdfRequest

    const latexTemplate = await generateLatex(
      data.personalDetails,
      data.experienceSection,
      data.projectSection
    )

    // Create unique temporary directory for output
    const tempId = uuidv4()
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `resume-${tempId}-`)
    )
    const expectedPdfPath = path.join(tempDir, 'texput.pdf') // Default output name for stdin

    try {
      // Try stdin approach with standard interface
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const tectonic = spawn(TECTONIC_PATH, [
          '-', // Read from stdin
          '-o',
          tempDir, // Output directory
        ])

        let errorOutput = ''

        tectonic.stderr.on('data', (chunk: Buffer) => {
          errorOutput += chunk.toString()
        })

        tectonic.on('close', async (code) => {
          if (code === 0) {
            try {
              // Tectonic usually names stdin output as 'texput.pdf'
              const pdfData = await fs.readFile(expectedPdfPath)
              resolve(pdfData)
            } catch (readError) {
              reject(new Error(`Failed to read generated PDF: ${readError}`))
            }
          } else {
            reject(
              new Error(
                `Tectonic process exited with code ${code}: ${errorOutput}`
              )
            )
          }
        })

        tectonic.on('error', (error) => {
          reject(error)
        })

        // Write LaTeX to stdin
        tectonic.stdin.write(latexTemplate)
        tectonic.stdin.end()
      })

      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true })

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="resume.pdf"',
        },
      })
    } catch (error) {
      // Clean up on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      throw error
    }
  } catch (error) {
    console.error('Tectonic compilation error:', error)
    return NextResponse.json(
      createErrorResponse([createError('server', 'Failed to compile PDF')]),
      { status: 500 }
    )
  }
}
