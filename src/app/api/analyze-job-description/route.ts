import { generateJobDescriptionAnalysisTool } from '@/lib/ai/tools'
import { generateJobDescriptionAnalysisPrompt } from '@/lib/ai/prompts'
import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { analyzeJobDescriptionRequestSchema } from '@/lib/validationSchemas'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { AnalyzeJobDescriptionRequest } from '@/lib/types/api'
import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult =
      analyzeJobDescriptionRequestSchema.safeParse(rawData)

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([
          createError('validation', 'Invalid request data'),
        ]),
        { status: 400 }
      )
    }

    const { jobDescription, settings } =
      validationResult.data as AnalyzeJobDescriptionRequest

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = generateJobDescriptionAnalysisPrompt(jobDescription)

    const completion = await openai.chat.completions.create({
      model: settings.languageModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      tools: [generateJobDescriptionAnalysisTool()],
      tool_choice: {
        type: 'function',
        function: { name: 'generate_job_description_analysis' },
      },
    })

    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return NextResponse.json(
        createErrorResponse([
          createError(
            'openai',
            'Failed to analyze job description: No tool call'
          ),
        ]),
        { status: 500 }
      )
    }

    const analysis = JSON.parse(
      toolCall.function.arguments
    ) as JobDescriptionAnalysis

    return NextResponse.json(createSuccessResponse(analysis), { status: 200 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      createErrorResponse([
        createError('server', 'Failed to analyze job description'),
      ]),
      { status: 500 }
    )
  }
}
