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
import { sanitizeGeneratedBulletText } from '@/lib/utils'

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
    // Perform a call for each section to maximize context retention.
    for (const sec of sections) {
      const tools = [
        generateSectionBulletPointsTool(settings.maxCharsPerBullet, numBullets),
      ]
      const prompt =
        sec.type === 'project'
          ? generateProjectBulletPointsPrompt(
              sec,
              jobDescriptionAnalysis,
              numBullets,
              settings.maxCharsPerBullet
            )
          : generateExperienceBulletPointsPrompt(
              sec,
              jobDescriptionAnalysis,
              numBullets,
              settings.maxCharsPerBullet
            )

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      let encoder: Tiktoken | undefined

      try {
        const tiktoken = await import('tiktoken')
        const modelToEncoding: Record<string, string> = {
          'gpt-4o': 'cl100k_base',
          'gpt-4o-mini': 'o200k_base',
          'gpt-3.5-turbo': 'cl100k_base',
          'gpt-4.1-mini': 'o200k_base',
        }
        const encodingName =
          modelToEncoding[settings.languageModel] || 'cl100k_base' // safe, widely compatible default
        encoder = tiktoken.get_encoding(encodingName as TiktokenEncoding)
      } catch (error) {
        console.warn(
          'tiktoken unavailable, using fallback token estimation',
          error
        )
        // Log more details for debugging in production
        if (error instanceof Error) {
          console.warn('tiktoken error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First few lines only
          })
        }
      }

      let maxTokens: number
      if (encoder) {
        // Input token count
        const inputTokens = encoder.encode(prompt).length
        // Ouput token estimate
        const bulletTokens =
          Math.ceil((settings.maxCharsPerBullet * 0.8) / 4) * numBullets
        const jsonOverhead = 15 + 5 * numBullets
        const toolCallOverhead = 50
        maxTokens = Math.ceil(
          (inputTokens + bulletTokens + jsonOverhead + toolCallOverhead) * 1.2
        )
      } else {
        // Fallback: character-based estimate
        const inputTokens = Math.ceil(prompt.length / 4)
        const bulletTokens =
          Math.ceil((settings.maxCharsPerBullet * 0.8) / 4) * numBullets
        maxTokens = inputTokens + bulletTokens + 100
      }

      try {
        const response = await openai.chat.completions.create({
          model: settings.languageModel,
          messages: [{ role: 'user', content: prompt }],
          tools,
          max_tokens: maxTokens,
          tool_choice: {
            type: 'function',
            function: { name: 'generate_section_bullets' },
          },
        })

        const toolCall = response.choices[0]?.message?.tool_calls?.[0]
        if (toolCall?.function?.name === 'generate_section_bullets') {
          const args = JSON.parse(toolCall.function.arguments)
          if (args?.bullets && Array.isArray(args.bullets)) {
            if (sec.targetBulletIds.length > 0) {
              results.push({
                sectionId: sec.id,
                bullets: args.bullets.map((bullet: string, index: number) => ({
                  id:
                    index < sec.targetBulletIds.length
                      ? sec.targetBulletIds[index]
                      : uuidv4(),
                  text: sanitizeGeneratedBulletText(bullet),
                  isLocked: false,
                })),
              })
            }
          }
        } else {
          return NextResponse.json(
            createErrorResponse([createError('server', 'Tool call failed')]),
            { status: 500 }
          )
        }
      } catch (error) {
        console.error(`OpenAI API error for section ${sec.id}:`, error)
        return NextResponse.json(
          createErrorResponse([
            createError('server', 'Failed to generate bullets'),
          ]),
          { status: 500 }
        )
      }
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
