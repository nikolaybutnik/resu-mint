import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { generateBulletsRequestSchema } from '@/lib/validationSchemas'
import { NextRequest, NextResponse } from 'next/server'
import { generateSectionBulletPointsPrompt } from '@/lib/ai/prompts'
import { generateSectionBulletPointsTool } from '@/lib/ai/tools'
import OpenAI from 'openai'
import { GenerateBulletsRequest } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult = generateBulletsRequestSchema.safeParse(rawData)

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([
          createError('validation', 'Invalid request data'),
        ]),
        { status: 400 }
      )
    }

    const data = validationResult.data as GenerateBulletsRequest
    const {
      section,
      existingBullets,
      jobDescriptionAnalysis,
      numBullets,
      maxCharsPerBullet,
    } = data

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = generateSectionBulletPointsPrompt(
      section,
      existingBullets,
      jobDescriptionAnalysis,
      numBullets,
      maxCharsPerBullet
    )

    const tools = [generateSectionBulletPointsTool(maxCharsPerBullet)]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      tools,
      tool_choice: {
        type: 'function',
        function: { name: 'generate_section_bullets' },
      },
    })

    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      console.error(
        'No tool call in completion:',
        JSON.stringify(completion, null, 2)
      )
      return NextResponse.json(
        createErrorResponse([
          createError(
            'openai',
            'Bullet generation failed: No tool call',
            'bullet_generation'
          ),
        ]),
        { status: 400 }
      )
    }

    let toolResult
    try {
      toolResult = JSON.parse(toolCall.function.arguments)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        createErrorResponse([
          createError(
            'openai',
            'Bullet generation failed: Invalid tool call JSON',
            'bullet_generation'
          ),
        ]),
        { status: 400 }
      )
    }

    if (toolResult.bullets.length < numBullets) {
      return NextResponse.json(
        createErrorResponse([
          createError(
            'openai',
            'Error generating bullets: too few bullets generated',
            'bullet_generation'
          ),
        ]),
        { status: 400 }
      )
    }
    const finalResult = toolResult.bullets.slice(0, numBullets)

    return NextResponse.json(createSuccessResponse(finalResult), {
      status: 200,
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      createErrorResponse([
        createError(
          'server',
          'Failed to generate bullets',
          'bullet_generation'
        ),
      ]),
      { status: 500 }
    )
  }
}
