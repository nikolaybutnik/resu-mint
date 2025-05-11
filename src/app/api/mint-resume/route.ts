import {
  ExperienceBlockData,
  Month,
} from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { PersonalDetailsFormValues } from '@/components/PersonalDetails/PersonalDetails'
import { ProjectBlockData } from '@/components/Projects/EditableProjectBlock/EditableProjectBlock'
import { SettingsFormValues } from '@/components/Settings/Settings'
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
import { z } from 'zod'

const execPromise = promisify(exec)

interface MintResumeRequestData {
  sessionId: string
  personalDetails: PersonalDetailsFormValues
  workExperience: ExperienceBlockData[]
  projects: ProjectBlockData[]
  jobDescription: string
  settings: SettingsFormValues
}

const monthSchema = z.enum([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as [Month, ...Month[]])

// TODO: move validation schemas to lib
const dateSchema = z.object({
  month: monthSchema,
  year: z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
})

const endDateSchema = z.object({
  month: monthSchema.or(z.literal('')),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Year must be four digits')
    .or(z.literal('')),
  isPresent: z.boolean(),
})

const personalDetailsSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
})

const experienceBlockSchema = z.object({
  id: z.string(),
  jobTitle: z.string().min(1, 'Job title is required'),
  companyName: z.string().min(1, 'Company name is required'),
  location: z.string().min(1, 'Location is required'),
  startDate: dateSchema,
  endDate: endDateSchema,
  bulletPoints: z.array(z.string()).optional().default([]),
  description: z.string().optional(),
})

const projectBlockSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  technologies: z.array(z.string()).optional().default([]),
  description: z.string().optional(),
  startDate: dateSchema,
  endDate: endDateSchema,
  bulletPoints: z.array(z.string()).optional().default([]),
  link: z.union([z.string().url('Invalid URL'), z.literal('')]).optional(),
})

const settingsSchema = z.object({
  bulletsPerExperienceBlock: z.number().int().min(1).max(10),
  bulletsPerProjectBlock: z.number().int().min(1).max(10),
  maxCharsPerBullet: z.number().int().min(100).max(500),
})

const mintResumeSchema = z.object({
  sessionId: z.string(),
  personalDetails: personalDetailsSchema,
  workExperience: z.array(experienceBlockSchema),
  projects: z.array(projectBlockSchema),
  jobDescription: z.string(),
  settings: settingsSchema,
})

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult = mintResumeSchema.safeParse(rawData)

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
