import OpenAI from 'openai'
import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { NextRequest, NextResponse } from 'next/server'
import { categorizeSkillsSchema } from '@/lib/validationSchemas'
import { skillCategorizationTool } from '@/lib/ai/tools'
import { generateSkillCategorizationPrompt } from '@/lib/ai/prompts'
import { CategorizeSkillsResponse } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult = categorizeSkillsSchema.safeParse(rawData)

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([
          createError('validation', 'Invalid request data'),
        ]),
        { status: 400 }
      )
    }

    const { jobAnalysis, skills, settings } = validationResult.data

    const requiredSkills = {
      hard: jobAnalysis.skillsRequired.hard,
      soft: jobAnalysis.skillsRequired.soft,
      contextual: jobAnalysis.contextualSkills,
    }
    const userSkills = {
      hard: skills.hardSkills.skills,
      soft: skills.softSkills.skills,
    }

    const prompt = generateSkillCategorizationPrompt(
      jobAnalysis.jobSummary,
      requiredSkills,
      userSkills
    )
    const tools = [skillCategorizationTool()]
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: settings.languageModel,
      messages: [{ role: 'user', content: prompt }],
      tools,
      tool_choice: {
        type: 'function',
        function: { name: 'categorize_skills' },
      },
    })

    const toolCall = response.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return NextResponse.json(
        createErrorResponse([
          createError('openai', 'Failed to categorize skills: No tool call'),
        ]),
        { status: 500 }
      )
    }

    const categorizedSkills = JSON.parse(toolCall.function.arguments)
      ?.categories as CategorizeSkillsResponse

    return NextResponse.json(createSuccessResponse(categorizedSkills), {
      status: 200,
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      createErrorResponse([
        createError('server', 'Failed to categorize user skills'),
      ]),
      { status: 500 }
    )
  }
}
