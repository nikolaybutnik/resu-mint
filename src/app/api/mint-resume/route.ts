import {
  BulletGenerationError,
  generateBulletPoints,
} from '@/lib/ai/generateBulletPoints'
import { generateLatex } from '@/lib/template/generateLatex'
import {
  createError,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/types/errors'
import { exec } from 'child_process'
import { readFile, unlink } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      personalDetails,
      workExperience,
      jobDescription,
      settings,
      sessionId,
    } = data

    const generatedBulletPoints = await generateBulletPoints(
      workExperience,
      jobDescription,
      settings
    )

    const hydratedLatex = await generateLatex(
      generatedBulletPoints.experience_bullets,
      workExperience,
      personalDetails
    )

    const texFilePath = join(tmpdir(), `resume-${sessionId}.tex`)
    const pdfFilePath = join(tmpdir(), `resume-${sessionId}.pdf`)

    await writeFile(texFilePath, hydratedLatex)

    await execPromise(`tectonic ${texFilePath} -o ${tmpdir()}`)

    const pdfBuffer = await readFile(pdfFilePath)

    if (texFilePath) await unlink(texFilePath)
    if (pdfFilePath) await unlink(pdfFilePath)

    return NextResponse.json(
      createSuccessResponse({
        bullets: generatedBulletPoints.experience_bullets,
        pdf: pdfBuffer.toString('base64'),
      })
    )
  } catch (error) {
    console.error('Server error:', error)
    if (error instanceof BulletGenerationError) {
      return NextResponse.json(createErrorResponse([error.error]), {
        status: error.error.type === 'missing_data' ? 400 : 500,
      })
    }

    return NextResponse.json(
      createErrorResponse([
        createError('server', 'Failed to mint resume', 'resume_generation'),
      ]),
      { status: 500 }
    )
  }
}
