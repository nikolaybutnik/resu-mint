import { NextRequest, NextResponse } from 'next/server'
import { createError, createErrorResponse } from '@/lib/types/errors'
import { createPdfRequestSchema } from '@/lib/validationSchemas'
import { CreatePdfRequest } from '@/lib/types/api'
import { generateLatex } from '@/lib/template/generateLatex'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'

const TECTONIC_PATH = path.join(
  process.cwd(),
  'bin',
  process.platform === 'linux' ? 'tectonic-linux' : 'tectonic'
)

export async function POST(request: NextRequest) {
  const requestStart = Date.now()

  try {
    console.info('PDF Generation Request Started')

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
      data.educationSection,
      data.skillsSection,
      data.settings
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

    // Pre-warmed cache directories (Fastest) - check project directory first for Vercel persistence
    const buildCacheDir = existsSync(
      path.join(process.cwd(), '.vercel-cache', 'tectonic-build-cache')
    )
      ? path.join(process.cwd(), '.vercel-cache', 'tectonic-build-cache')
      : path.join(os.tmpdir(), 'tectonic-build-cache')

    const buildXdgCacheDir = existsSync(
      path.join(process.cwd(), '.vercel-cache', 'xdg-build-cache')
    )
      ? path.join(process.cwd(), '.vercel-cache', 'xdg-build-cache')
      : path.join(os.tmpdir(), 'xdg-build-cache')

    // Check cache availability
    const buildCacheExists = await fs
      .access(buildCacheDir)
      .then(() => true)
      .catch(() => false)

    const buildXdgCacheExists = await fs
      .access(buildXdgCacheDir)
      .then(() => true)
      .catch(() => false)

    const sharedCacheExists = await fs
      .access(sharedCacheDir)
      .then(() => true)
      .catch(() => false)

    const sharedXdgCacheExists = await fs
      .access(sharedXdgCacheDir)
      .then(() => true)
      .catch(() => false)

    // Use build cache if it exists (from cache warming), otherwise use shared cache
    const cacheDir = buildCacheExists ? buildCacheDir : sharedCacheDir
    const xdgCacheDir = buildXdgCacheExists
      ? buildXdgCacheDir
      : sharedXdgCacheDir

    // Determine and log cache tier being used
    const hasBuildCache = buildCacheExists || buildXdgCacheExists
    const hasRuntimeCache = sharedCacheExists || sharedXdgCacheExists

    let cacheTier = 'COLD_START'
    let expectedTime = '8-12s'

    if (hasBuildCache) {
      cacheTier = 'BUILD_CACHE'
      expectedTime = '2-3s'
      console.info('Using BUILD CACHE (Pre-warmed) - Expected: 2-3 seconds')
    } else if (hasRuntimeCache) {
      cacheTier = 'RUNTIME_CACHE'
      expectedTime = '4-6s'
      console.warn('Using RUNTIME CACHE (On-demand) - Expected: 4-12 seconds')
    } else {
      console.warn(
        'NO CACHE FOUND - Cold start download - Expected: 8-12 seconds'
      )
    }

    const expectedPdfPath = path.join(tempDir, 'texput.pdf')

    // Create cache directories if they don't exist
    await fs.mkdir(cacheDir, { recursive: true }).catch(() => {})
    await fs.mkdir(xdgCacheDir, { recursive: true }).catch(() => {})

    try {
      try {
        await fs.access(TECTONIC_PATH, fs.constants.F_OK | fs.constants.X_OK)
        console.log('Tectonic binary found and executable')
      } catch {
        throw new Error(
          `Tectonic binary not found or not executable at ${TECTONIC_PATH}.`
        )
      }

      if (!latexTemplate || latexTemplate.trim() === '') {
        throw new Error('Empty LaTeX template')
      }

      console.log('Starting Tectonic compilation...')
      const compilationStart = Date.now()

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
          const compilationTime = Date.now() - compilationStart

          if (code === 0) {
            console.log(
              `Tectonic compilation successful in ${compilationTime}ms`
            )
            console.info(
              `Performance: ${cacheTier} (Expected: ${expectedTime}, Actual: ${compilationTime}ms)`
            )

            try {
              const pdfData = await fs.readFile(expectedPdfPath)
              console.log(
                `PDF generated successfully (${pdfData.length} bytes)`
              )
              resolve(pdfData)
            } catch (readError) {
              console.error('Failed to read generated PDF:', readError)
              reject(new Error(`Failed to read generated PDF: ${readError}`))
            }
          } else {
            console.error(
              `Tectonic compilation failed with code ${code} after ${compilationTime}ms`
            )
            console.error('Stderr output:', errorOutput)
            reject(
              new Error(
                `Tectonic process exited with code ${code}: ${errorOutput}`
              )
            )
          }
        })

        tectonic.on('error', (error: Error & { code?: string }) => {
          console.error('Tectonic process error:', error)
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

      const totalTime = Date.now() - requestStart
      console.info(
        `PDF Request Completed in ${totalTime}ms (Cache: ${cacheTier})`
      )
      console.log('─'.repeat(60))

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="resume.pdf"',
        },
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      // Clean up on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
      throw error
    }
  } catch (error) {
    const totalTime = Date.now() - requestStart
    console.error(`PDF Request Failed after ${totalTime}ms:`, error)
    console.error('─'.repeat(60))

    return NextResponse.json(
      createErrorResponse([createError('server', 'Failed to compile PDF')]),
      { status: 500 }
    )
  }
}
