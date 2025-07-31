import OpenAI from 'openai'
import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { NextRequest, NextResponse } from 'next/server'
import { extractSkillsSchema } from '@/lib/validationSchemas'
import { generateSkillsExtractionPrompt } from '@/lib/ai/prompts'
import { skillExtractionTool } from '@/lib/ai/tools'
import { ExtractSkillsResponse } from '@/lib/types/api'

const cleanSkill = (skill: string): string => {
  return skill.trim().replace(/^["']|["']$/g, '')
}

const normalizeForComparison = (skill: string): string => {
  return skill.trim().toLowerCase().replace(/\s+/g, ' ')
}

const filterExistingSkills = (
  extractedSkills: string[],
  existingSkills: string[]
): string[] => {
  const normalizedExistingSkills = existingSkills.map(normalizeForComparison)

  return extractedSkills.filter((skill) => {
    const normalizedSkill = normalizeForComparison(skill)
    return !normalizedExistingSkills.includes(normalizedSkill)
  })
}

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json()
    const validationResult = extractSkillsSchema.safeParse(rawData)

    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse([
          createError('validation', 'Invalid request data'),
        ]),
        { status: 400 }
      )
    }

    const { experienceSections, projectSections, currentSkills, settings } =
      validationResult.data

    if (experienceSections.length === 0 && projectSections.length === 0) {
      return NextResponse.json(createSuccessResponse(currentSkills), {
        status: 200,
      })
    }

    const combinedDescriptionContent = [
      ...experienceSections.map(
        (e) => `
      JOB TITLE: ${e.title}

      JOB DUTIES: 
      ${e.description}
      `
      ),
      ...projectSections.map(
        (p) => `
      PROJECT NAME: ${p.title}

      PROJECT TASKS:
      ${p.description}
      `
      ),
    ].join('\n')
    const prompt = generateSkillsExtractionPrompt(combinedDescriptionContent, {
      hardSkills: currentSkills.hardSkills.skills,
      softSkills: currentSkills.softSkills.skills,
    })
    const tools = [skillExtractionTool()]
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: settings.languageModel,
      messages: [{ role: 'user', content: prompt }],
      tools,
      tool_choice: {
        type: 'function',
        function: { name: 'extract_skills' },
      },
    })

    const toolCall = response.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return NextResponse.json(
        createErrorResponse([
          createError(
            'openai',
            'Failed to extract skills from content: No tool call'
          ),
        ]),
        { status: 500 }
      )
    }

    const extractedSkills = JSON.parse(
      toolCall.function.arguments
    ) as ExtractSkillsResponse

    const cleanedHardSkills = extractedSkills.hardSkills
      .map(cleanSkill)
      .filter((skill) => skill.length > 0)

    const cleanedSoftSkills = extractedSkills.softSkills
      .map(cleanSkill)
      .filter((skill) => skill.length > 0)

    const deduplicatedSkills = {
      hardSkills: filterExistingSkills(
        cleanedHardSkills,
        currentSkills.hardSkills.skills
      ),
      softSkills: filterExistingSkills(
        cleanedSoftSkills,
        currentSkills.softSkills.skills
      ),
    }

    return NextResponse.json(createSuccessResponse(deduplicatedSkills), {
      status: 200,
    })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      createErrorResponse([
        createError('server', 'Failed to extract skills from section content'),
      ]),
      { status: 500 }
    )
  }
}
