import { parseSectionSkillsPrompt } from '@/lib/ai/prompts'
import { createError, createSuccessResponse } from '@/lib/types/errors'
import { createErrorResponse } from '@/lib/types/errors'
import { generateSkillsRequestSchema } from '@/lib/validationSchemas'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { parseSectionSkillsTool } from '@/lib/ai/tools'
import { ParseSectionSkillsResponse } from '@/lib/types/api'

const cleanSkill = (skill: string): string => {
  return skill.trim().replace(/^["']|["']$/g, '')
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

    console.log(validationResult.data)

    // const { sectionDescriptions, settings } = validationResult.data

    // const prompt = parseSectionSkillsPrompt(sectionDescriptions)
    // const tools = [parseSectionSkillsTool()]
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // const response = await openai.chat.completions.create({
    //   model: settings.languageModel,
    //   messages: [{ role: 'user', content: prompt }],
    //   tools,
    //   tool_choice: {
    //     type: 'function',
    //     function: { name: 'parse_section_skills' },
    //   },
    // })

    // const toolCall = response.choices[0].message.tool_calls?.[0]
    // if (!toolCall) {
    //   return NextResponse.json(
    //     createErrorResponse([
    //       createError(
    //         'openai',
    //         'Failed to parse skills from section content: No tool call'
    //       ),
    //     ]),
    //     { status: 500 }
    //   )
    // }

    // const skills = JSON.parse(
    //   toolCall.function.arguments
    // ) as ParseSectionSkillsResponse

    // const cleanedSkills = {
    //   hardSkills: skills.hardSkills.map(cleanSkill),
    //   softSkills: skills.softSkills.map(cleanSkill),
    // }

    // return NextResponse.json(createSuccessResponse(cleanedSkills), {
    //   status: 200,
    // })
    return NextResponse.json(createSuccessResponse('success'), {
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
