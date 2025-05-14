import OpenAI from 'openai'
import { generateResumeBulletPointsTool } from '@/lib/ai/tools'
import { generateResumeBulletPointsPrompt } from '@/lib/ai/prompts'
import { SettingsFormValues } from '@/components/Settings/Settings'
import { ExperienceBlockData } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { ApiError } from '../types/errors'
import { ProjectBlockData } from '@/components/Projects/EditableProjectBlock/EditableProjectBlock'
import { JobDescriptionAnalysis } from '@/app/api/analyze-job-description/route'

interface GeneratedBulletsResponseModel {
  project_bullets: { id: string; bullets: string[] }[]
  experience_bullets: { id: string; bullets: string[] }[]
}

export class BulletGenerationError extends Error {
  constructor(public error: ApiError) {
    super(error.message)
    this.name = 'BulletGenerationError'
  }
}

// Notes:
// one token is approximately 4 characters (including spaces)
// a word is usually 1 - 3 tokens
// 100 characters is approximately 25 tokens

export const generateBulletPoints = async (
  workExperience: ExperienceBlockData[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  settings: SettingsFormValues,
  projects?: ProjectBlockData[]
): Promise<GeneratedBulletsResponseModel> => {
  if (!workExperience) {
    throw new BulletGenerationError({
      field: 'client',
      message: 'Work experience is required',
      type: 'missing_data',
    })
  }
  if (!jobDescriptionAnalysis) {
    throw new BulletGenerationError({
      field: 'client',
      message: 'Job analysis is required',
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
        settings.bulletsPerProjectBlock,
        settings.maxCharsPerBullet
      ),
    ]
    const prompt = generateResumeBulletPointsPrompt(
      workExperience,
      jobDescriptionAnalysis,
      settings.bulletsPerExperienceBlock,
      settings.bulletsPerProjectBlock,
      settings.maxCharsPerBullet,
      projects
    )
    const totalBullets =
      workExperience.length * settings.bulletsPerExperienceBlock +
      (projects?.length || 0) * settings.bulletsPerProjectBlock
    const max_tokens = totalBullets * 100 + 1000

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens,
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

    let toolResult: GeneratedBulletsResponseModel
    try {
      toolResult = JSON.parse(
        toolCall.function.arguments
      ) as GeneratedBulletsResponseModel
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new BulletGenerationError({
        field: 'openai',
        message: 'Bullet generation failed: Invalid tool call JSON',
        type: 'ai_generation',
      })
    }

    if (
      !toolResult.experience_bullets ||
      toolResult.experience_bullets.length === 0
    ) {
      throw new BulletGenerationError({
        field: 'openai',
        message: 'Bullet generation failed: Empty experience bullets',
        type: 'ai_generation',
      })
    }
    toolResult.experience_bullets.forEach((exp) => {
      if (exp.bullets.length !== settings.bulletsPerExperienceBlock) {
        console.error(
          `Validation failed for experience ID ${exp.id}: Expected ${settings.bulletsPerExperienceBlock} bullets, got ${exp.bullets.length}`
        )
        throw new BulletGenerationError({
          field: 'openai',
          message: `Expected ${settings.bulletsPerExperienceBlock} bullets, got ${exp.bullets.length} for experience ID ${exp.id}`,
          type: 'ai_generation',
        })
      }
    })
    toolResult.project_bullets.forEach((proj) => {
      if (proj.bullets.length !== settings.bulletsPerProjectBlock) {
        console.error(
          `Validation failed for project ID ${proj.id}: Expected ${settings.bulletsPerProjectBlock} bullets, got ${proj.bullets.length}`
        )
        throw new BulletGenerationError({
          field: 'openai',
          message: `Expected ${settings.bulletsPerProjectBlock} bullets, got ${proj.bullets.length} for project ID ${proj.id}`,
          type: 'ai_generation',
        })
      }
    })

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
