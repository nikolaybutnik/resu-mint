import OpenAI from 'openai'
import { generateResumeBulletPointsTool } from '@/lib/ai/tools'
import { generateResumeBulletPointsPrompt } from '@/lib/ai/prompts'
import { SettingsFormValues } from '@/components/Settings/Settings'
import { ExperienceBlockData } from '@/components/EditableExperienceBlock/EditableExperienceBlock'
import { ApiError } from '../types/errors'

interface GeneratedBulletsResponseModel {
  experience_bullets: { id: string; bullets: string[] }[]
}

export class BulletGenerationError extends Error {
  constructor(public error: ApiError) {
    super(error.message)
    this.name = 'BulletGenerationError'
  }
}

export const generateBulletPoints = async (
  workExperience: ExperienceBlockData[],
  jobDescription: string,
  settings: SettingsFormValues
): Promise<GeneratedBulletsResponseModel> => {
  if (!workExperience) {
    throw new BulletGenerationError({
      field: 'client',
      message: 'Work experience is required',
      type: 'missing_data',
    })
  }
  if (!jobDescription) {
    throw new BulletGenerationError({
      field: 'client',
      message: 'Job description is required',
      type: 'missing_data',
    })
  }
  if (!settings) {
    throw new BulletGenerationError({
      field: 'client',
      message: 'Settings are required',
      type: 'missing_data',
    })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const tools = [
      generateResumeBulletPointsTool(
        settings.bulletsPerExperienceBlock,
        settings.maxCharsPerBullet
      ),
    ]
    const prompt = generateResumeBulletPointsPrompt(
      workExperience,
      jobDescription,
      settings.bulletsPerExperienceBlock,
      settings.maxCharsPerBullet
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens:
        workExperience.length * settings.bulletsPerExperienceBlock * 500,
      tools,
      tool_choice: {
        type: 'function',
        function: { name: 'generate_resume_bullets' },
      },
    })

    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      throw new BulletGenerationError({
        field: 'openai',
        message: 'Bullet generation failed: No tool call',
        type: 'ai_generation',
      })
    }

    const toolResult = JSON.parse(
      toolCall.function.arguments
    ) as GeneratedBulletsResponseModel

    if (
      !toolResult.experience_bullets ||
      Object.keys(toolResult.experience_bullets).length === 0
    ) {
      throw new BulletGenerationError({
        field: 'openai',
        message: 'Bullet generation failed: Empty result',
        type: 'ai_generation',
      })
    }

    return toolResult
  } catch (error) {
    console.error('API error:', error)
    if (error instanceof BulletGenerationError) {
      throw error
    }
    throw new BulletGenerationError({
      field: 'server',
      message: 'API error',
      type: 'server',
    })
  }
}
