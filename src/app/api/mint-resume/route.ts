import {
  BulletGenerationError,
  generateBulletPoints,
} from '@/lib/ai/generateBulletPoints'
import {
  createError,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/types/errors'
import { NextRequest, NextResponse } from 'next/server'

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

    // Temporary response
    return NextResponse.json(
      createSuccessResponse(generatedBulletPoints.experience_bullets)
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
