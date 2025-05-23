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
import { generateExperienceBulletPointsPrompt } from '@/lib/ai/prompts'
import { generateProjectBulletPointsPrompt } from '@/lib/ai/prompts'
import { OpenAI } from 'openai'
import { generateSectionBulletPointsTool } from '@/lib/ai/tools'
import { Tiktoken, TiktokenEncoding } from 'tiktoken'

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
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

      const targetNumBullets = Math.min(numBullets, maxBullets)
      const tools = [
        generateSectionBulletPointsTool(
          settings.maxCharsPerBullet,
          targetNumBullets
        ),
      ]
      const prompt =
        sec.type === 'project'
          ? generateProjectBulletPointsPrompt(
              sections,
              jobDescriptionAnalysis,
              targetNumBullets,
              settings.maxCharsPerBullet
            )
          : generateExperienceBulletPointsPrompt(
              sections,
              jobDescriptionAnalysis,
              targetNumBullets,
              settings.maxCharsPerBullet
            )

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      let encoder: Tiktoken | undefined

      try {
        const tiktoken = await import('tiktoken')
        const modelToEncoding: Record<string, string> = {
          'gpt-4o': 'cl100k_base',
          'gpt-4o-mini': 'o200k_base',
        }
        const encodingName =
          modelToEncoding[settings.languageModel] || 'cl100k_base' // safe, widely compatible default
        encoder = tiktoken.get_encoding(encodingName as TiktokenEncoding)
      } catch (error) {
        console.warn(
          'tiktoken unavailable, using fallback token estimation',
          error
        )
      }

      let maxTokens: number
      if (encoder) {
        // Input token count
        const inputTokens = encoder.encode(prompt).length
        // Ouput token estimate
        const bulletTokens =
          Math.ceil((settings.maxCharsPerBullet * 0.8) / 4) * targetNumBullets
        const jsonOverhead = 15 + 5 * targetNumBullets
        const toolCallOverhead = 50
        maxTokens = Math.ceil(
          (inputTokens + bulletTokens + jsonOverhead + toolCallOverhead) * 1.2
        )
      } else {
        // Fallback: character-based estimate
        const inputTokens = Math.ceil(prompt.length / 4)
        const bulletTokens =
          Math.ceil((settings.maxCharsPerBullet * 0.8) / 4) * targetNumBullets
        maxTokens = inputTokens + bulletTokens + 100
      }

      // try {
      //   const response = await openai.chat.completions.create({
      //     model: settings.languageModel,
      //     messages: [{ role: 'user', content: prompt }],
      //     tools,
      //     max_tokens: maxTokens,
      //     tool_choice: {
      //       type: 'function',
      //       function: { name: 'generate_section_bullets' },
      //     },
      //   })
      //  // tool call logic
      // } catch (error) {
      //   console.error(`OpenAI API error for section ${sec.id}:`, error)
      //   // Geerated bullet placeholders fallback???
      //   return NextResponse.json(
      //     createErrorResponse([
      //       createError('server', 'Failed to generate bullets'),
      //     ]),
      //     { status: 500 }
      //   )
      // }
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
