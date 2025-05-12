import { ExperienceBlockData } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { PersonalDetailsFormValues } from '@/components/PersonalDetails/PersonalDetails'
import { ProjectBlockData } from '@/components/Projects/EditableProjectBlock/EditableProjectBlock'
import { SettingsFormValues } from '@/components/Settings/Settings'
import {
  BulletGenerationError,
  generateBulletPoints,
} from '@/lib/ai/generateBulletPoints'
import { generateLatex } from '@/lib/template/generateLatex'
import { createError, createErrorResponse } from '@/lib/types/errors'
import { resumeMintRequestSchema } from '@/lib/validationSchemas'
import { exec } from 'child_process'
import { readFile, unlink } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

interface MintResumeRequestData {
  sessionId: string
  personalDetails: PersonalDetailsFormValues
  workExperience: ExperienceBlockData[]
  projects: ProjectBlockData[]
  jobDescription: string
  settings: SettingsFormValues
}

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult = resumeMintRequestSchema.safeParse(rawData)

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([
          createError('validation', 'Invalid request data'),
        ]),
        { status: 400 }
      )
    }

    const data = validationResult.data as MintResumeRequestData
    const {
      personalDetails,
      workExperience,
      projects,
      jobDescription,
      settings,
      sessionId,
    } = data

    // TODO: this functionality may need to be separated later on
    // The idea is that the bullet points are already generated when teh user mints the resume
    const generatedBulletPoints = await generateBulletPoints(
      workExperience,
      jobDescription,
      settings,
      projects
    )

    // console.log('generatedBulletPoints', generatedBulletPoints)

    const hydratedLatex = await generateLatex(
      generatedBulletPoints.experience_bullets,
      workExperience,
      personalDetails,
      projects,
      generatedBulletPoints.project_bullets
    )

    const texFilePath = join(tmpdir(), `resume-${sessionId}.tex`)
    const pdfFilePath = join(tmpdir(), `resume-${sessionId}.pdf`)

    await writeFile(texFilePath, hydratedLatex)

    await execPromise(`tectonic ${texFilePath} -o ${tmpdir()}`)

    const pdfBuffer = await readFile(pdfFilePath)

    if (texFilePath) await unlink(texFilePath)
    if (pdfFilePath) await unlink(pdfFilePath)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
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
