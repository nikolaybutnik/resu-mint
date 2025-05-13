import { generateJobDescriptionAnalysisTool } from '@/lib/ai/tools'
import { generateJobDescriptionAnalysisPrompt } from '@/lib/ai/prompts'
import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { analyzeJobDescriptionRequestSchema } from '@/lib/validationSchemas'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface AnalyzeJobDescriptionRequest {
  sessionId: string
  jobDescription: string
}

export interface JobDescriptionAnalysis {
  skillsRequired: {
    hard: string[] // e.g., ["React", "TypeScript", "GraphQL"]
    soft: string[] // e.g., ["Collaboration", "Problem-solving", "Communication"]
  }
  jobTitle: string // e.g., "Developer III, Front End (Javascript)- Enterprise"
  jobSummary: string // Concise summary of responsibilities and role, ~100-150 words
  specialInstructions: string // e.g., "Submit portfolio to hiring@example.com with a cover letter"
  location: {
    type: 'remote' | 'hybrid' | 'on-site' // Primary work arrangement
    details: string // Clarifications, e.g., "Remote, but requires quarterly on-site meetings in Ottawa, ON"
    listedLocation: string // Raw location from posting, e.g., "Ottawa, ON (Remote)"
  }
  companyName: string // e.g., "Billy Bob's Solutions"
  companyDescription: string // e.g., "Billy Bob's Solutions is a software development company that specializes in building custom software solutions for businesses..."
  contextualTechnologies: string[] // e.g., ["AWS", "Docker", "Kafka"]
}

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

    const { sessionId, jobDescription } =
      validationResult.data as AnalyzeJobDescriptionRequest

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = generateJobDescriptionAnalysisPrompt(jobDescription)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
            'Failed to analyze job description: No tool call',
            'ai_generation'
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
        createError(
          'server',
          'Failed to analyze job description',
          'job_analysis'
        ),
      ]),
      { status: 500 }
    )
  }
}
