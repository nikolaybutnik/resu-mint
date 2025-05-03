import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getResumeTemplate } from '@/lib/resume-template'
import {
  zodErrorsToApiErrors,
  createError,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/types/errors'
import { writeFile, access } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'

const execPromise = promisify(exec)

const latexSchema = z.object({
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = latexSchema.safeParse(body)

    if (!result.success) {
      const errors = zodErrorsToApiErrors(result.error.issues)
      return NextResponse.json(createErrorResponse(errors), { status: 400 })
    }

    const { name, email, phone, generatedSections } = result.data as LatexFields

    const latexContent = getResumeTemplate(
      name,
      email,
      phone,
      generatedSections
    )

    const fileId = uuidv4()
    const texFilePath = join(tmpdir(), `resume-${fileId}.tex`)
    const pdfFilePath = join(tmpdir(), `resume-${fileId}.pdf`)

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

    try {
      await execPromise(`tectonic ${texFilePath} -o ${tmpdir()}`)
      // Verify PDF exists
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

    return NextResponse.json(
      createSuccessResponse({ pdfPath: pdfFilePath, latex: latexContent }),
      {
        status: 200,
      }
    )
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
