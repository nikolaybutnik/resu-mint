import { generateSkillSuggestionsPrompt } from '@/lib/ai/prompts'
import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { generateSkillsRequestSchema } from '@/lib/validationSchemas'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { generateSkillSuggestionsTool } from '@/lib/ai/tools'
import { GenerateSkillSuggestionsResponse } from '@/lib/types/api'

const cleanSkill = (skill: string): string => {
  return skill.trim().replace(/^["']|["']$/g, '')
}

const normalizeForComparison = (skill: string): string => {
  return skill.trim().toLowerCase().replace(/\s+/g, ' ')
}

const filterExistingSkills = (
  suggestions: string[],
  existingSkills: string[]
): string[] => {
  const normalizedExistingSkills = existingSkills.map(normalizeForComparison)

  return suggestions.filter((suggestion) => {
    const normalizedSuggestion = normalizeForComparison(suggestion)
    return !normalizedExistingSkills.includes(normalizedSuggestion)
  })
}

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult = generateSkillsRequestSchema.safeParse(rawData)

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([
          createError('validation', 'Invalid request data'),
        ]),
        { status: 400 }
      )
    }

    const { jobAnalysis, currentSkills, userExperience, settings } =
      validationResult.data

    if (userExperience.length === 0) {
      return NextResponse.json(
        createSuccessResponse({
          hardSkillSuggestions: [],
          softSkillSuggestions: [],
        }),
        { status: 200 }
      )
    }

    const prompt = generateSkillSuggestionsPrompt(
      jobAnalysis,
      currentSkills,
      userExperience
    )
    const tools = [generateSkillSuggestionsTool()]
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: settings.languageModel,
      messages: [{ role: 'user', content: prompt }],
      tools,
      tool_choice: {
        type: 'function',
        function: { name: 'generate_skill_suggestions' },
      },
    })

    const toolCall = response.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return NextResponse.json(
        createErrorResponse([
          createError(
            'openai',
            'Failed to parse skills from section content: No tool call'
          ),
        ]),
        { status: 500 }
      )
    }

    const suggestions = JSON.parse(
      toolCall.function.arguments
    ) as GenerateSkillSuggestionsResponse

    const cleanedHardSuggestions = suggestions.hardSkillSuggestions
      .map(cleanSkill)
      .filter((skill) => skill.length > 0)

    const cleanedSoftSuggestions = suggestions.softSkillSuggestions
      .map(cleanSkill)
      .filter((skill) => skill.length > 0)

    const filteredSuggestions = {
      hardSkillSuggestions: filterExistingSkills(
        cleanedHardSuggestions,
        currentSkills.hardSkills.skills
      ),
      softSkillSuggestions: filterExistingSkills(
        cleanedSoftSuggestions,
        currentSkills.softSkills.skills
      ),
    }
    return NextResponse.json(createSuccessResponse(filteredSuggestions), {
      status: 200,
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      createErrorResponse([
        createError('server', 'Failed to parse skills from section content'),
      ]),
      { status: 500 }
    )
  }
}
