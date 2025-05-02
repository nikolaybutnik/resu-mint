import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getResumeTemplate } from '@/lib/resume-template'

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
      return NextResponse.json({ errors: result.error.issues }, { status: 400 })
    }

    const { name, email, phone, generatedSections } = result.data as LatexFields

    const latexContent = getResumeTemplate(
      name,
      email,
      phone,
      generatedSections
    )

    return NextResponse.json({ latex: latexContent }, { status: 200 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { errors: { server: 'Failed to generate latex' } },
      { status: 500 }
    )
  }
}
