import { NextRequest, NextResponse } from 'next/server'
import { generateBulletsRequestSchema } from '@/lib/validationSchemas'
import {
  createError,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/types/errors'
import { GenerateBulletsRequest } from '@/lib/types/api'
import { v4 as uuidv4 } from 'uuid'
import { BulletPoint } from '@/lib/types/experience'

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    console.log('rawData', rawData)
    const validationResult = generateBulletsRequestSchema.safeParse(rawData)

    if (!validationResult.success) {
      console.error(
        'Data from client failed to validate',
        validationResult.error
      )
      return NextResponse.json(
        createErrorResponse([createError('client', 'Invalid request data')]),
        { status: 400 }
      )
    }

    const data = validationResult.data as GenerateBulletsRequest
    const { sections, jobDescriptionAnalysis, settings, numBullets } = data

    if (sections.length === 0) {
      return NextResponse.json(
        createErrorResponse([
          createError('client', 'At least one section is required'),
        ]),
        { status: 400 }
      )
    }

    if (numBullets < 1) {
      return NextResponse.json(
        createErrorResponse([
          createError('client', 'numBullets must be at least 1'),
        ]),
        { status: 400 }
      )
    }

    if (
      settings.bulletsPerProjectBlock < 1 ||
      settings.bulletsPerExperienceBlock < 1
    ) {
      return NextResponse.json(
        createErrorResponse([
          createError('client', 'Invalid bullet count settings'),
        ]),
        { status: 400 }
      )
    }

    const results: {
      sectionId: string
      bullets: BulletPoint[]
    }[] = []
    for (const sec of sections) {
      const existingCount = sec.existingBullets.length
      const maxBullets =
        sec.type === 'project'
          ? settings.bulletsPerProjectBlock - existingCount
          : settings.bulletsPerExperienceBlock - existingCount

      if (maxBullets < 1) {
        // No room for new bullets, return existing
        results.push({
          sectionId: sec.id,
          bullets: sec.existingBullets,
        })
        continue
      }

      const targetNumBullets = Math.min(numBullets, maxBullets)
      // Placeholder for AI generation
      const generatedBullets = Array.from(
        { length: targetNumBullets },
        (_, i) => ({
          id: sec.targetBulletIds[i] || uuidv4(),
          text: `Generated bullet ${i + 1} for section ${sec.id} - TBD`,
          isLocked: false,
        })
      )
      results.push({
        sectionId: sec.id,
        bullets: generatedBullets,
      })
    }

    return NextResponse.json(createSuccessResponse(results), { status: 200 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      createErrorResponse([
        createError('server', 'Failed to generate bullets'),
      ]),
      { status: 500 }
    )
  }
}
