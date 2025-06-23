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

const TECTONIC_PATH = path.join(
  process.cwd(),
  'bin',
  process.platform === 'linux' ? 'tectonic-linux' : 'tectonic'
)

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
      data.projectSection,
      data.educationSection
    )

    // Create unique temporary directory for output per request
    const tempId = uuidv4()
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `resume-${tempId}-`)
    )

    // Runtime cache directories created during first PDF request if build cache not found (Medium)
    // Shared across requests in same container
    const sharedCacheDir = path.join(os.tmpdir(), 'tectonic-shared-cache')
    const sharedXdgCacheDir = path.join(os.tmpdir(), 'xdg-shared-cache')

    // Pre-warmed cache directories (Fastest)
    const buildCacheDir = path.join(os.tmpdir(), 'tectonic-build-cache')
    const buildXdgCacheDir = path.join(os.tmpdir(), 'xdg-build-cache')

    // Use build cache if it exists (from cache warming), otherwise use shared cache
    const cacheDir = (await fs
      .access(buildCacheDir)
      .then(() => true)
      .catch(() => false))
      ? buildCacheDir
      : sharedCacheDir
    const xdgCacheDir = (await fs
      .access(buildXdgCacheDir)
      .then(() => true)
      .catch(() => false))
      ? buildXdgCacheDir
      : sharedXdgCacheDir
    const expectedPdfPath = path.join(tempDir, 'texput.pdf')

    // Create cache directories if they don't exist
    await fs.mkdir(cacheDir, { recursive: true }).catch(() => {})
    await fs.mkdir(xdgCacheDir, { recursive: true }).catch(() => {})

    try {
      try {
        await fs.access(TECTONIC_PATH, fs.constants.F_OK | fs.constants.X_OK)
      } catch {
        throw new Error(
          `Tectonic binary not found or not executable at ${TECTONIC_PATH}.`
        )
      }

      if (!latexTemplate || latexTemplate.trim() === '') {
        throw new Error('Empty LaTeX template')
      }

      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const tectonic = spawn(
          TECTONIC_PATH,
          ['-X', 'compile', '-', '--outdir', tempDir],
          {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              // Use cache directories for better performance
              TECTONIC_CACHE_DIR: cacheDir,
              XDG_CACHE_HOME: xdgCacheDir,
              HOME: tempDir, // Still use temp dir as home for other writes
            },
          }
        )

        let errorOutput = ''

        tectonic.stderr.on('data', (chunk: Buffer) => {
          errorOutput += chunk.toString()
        })

        tectonic.on('close', async (code) => {
          if (code === 0) {
            try {
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

        tectonic.on('error', (error: Error & { code?: string }) => {
          if (error.code === 'ENOENT') {
            reject(
              new Error(
                `Failed to spawn Tectonic at ${TECTONIC_PATH}. Check binary compatibility and permissions.`
              )
            )
          } else {
            reject(error)
          }
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
