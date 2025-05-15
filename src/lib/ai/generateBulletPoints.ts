import OpenAI from 'openai'
import {
  generateResumeBulletPointsTool,
  generateSectionBulletPointsTool,
} from '@/lib/ai/tools'
import {
  generateResumeBulletPointsPrompt,
  generateSectionBulletPointsPrompt,
} from '@/lib/ai/prompts'
import { ExperienceBlockData } from '@/lib/types/experience'
import { ApiError } from '../types/errors'
import { BulletPoint, ProjectBlockData } from '@/lib/types/projects'
import { JobDescriptionAnalysis } from '@/lib/types/api'
import { v4 as uuidv4 } from 'uuid'
import { GeneratedBulletsResponseModel } from '@/lib/types/api'
import { AppSettings } from '../types/settings'

export class BulletGenerationError extends Error {
  constructor(public error: ApiError) {
    super(error.message)
    this.name = 'BulletGenerationError'
  }
}

// Notes:
// one token is approximately 4 characters
// 115 characters (max per bullet) is ~29 tokens, so 100 tokens per bullet is safe

async function generateSectionBulletPoints(
  sectionId: string,
  section: {
    type: 'experience' | 'project'
    description: string
  },
  existingBullets: BulletPoint[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  openai: OpenAI,
  settings: AppSettings
): Promise<BulletPoint[]> {
  const missingCount =
    settings.bulletsPerExperienceBlock - existingBullets.length
  if (missingCount <= 0) {
    return existingBullets.slice(0, settings.bulletsPerExperienceBlock)
  }

  // TODO: When locking is implemented, filter out locked bullets from existingBullets
  // const unlockedBullets = existingBullets.filter(b => !b.locked);

  const prompt = generateSectionBulletPointsPrompt(
    section,
    existingBullets, // Use all bullets for context; locking will filter later
    jobDescriptionAnalysis,
    missingCount,
    settings.maxCharsPerBullet
  )

  const tools = [
    generateSectionBulletPointsTool(settings.maxCharsPerBullet, missingCount),
  ]

  const completion = await openai.chat.completions.create({
    model: settings.languageModel,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: missingCount * 100 + 500, // 500 for structure
    tools,
    tool_choice: {
      type: 'function',
      function: { name: 'generate_section_bullets' },
    },
  })

  const toolCall = completion.choices[0].message.tool_calls?.[0]
  if (!toolCall) {
    console.error(
      'No tool call in completion for section ID:',
      sectionId,
      JSON.stringify(completion, null, 2)
    )
    throw new BulletGenerationError({
      field: 'openai',
      message: `Failed to generate bullets for section ID ${sectionId}: No tool call`,
      type: 'ai_generation',
    })
  }

  let newBullets: BulletPoint[] = []
  try {
    const toolResult = JSON.parse(toolCall.function.arguments)
    newBullets = toolResult.bullets.map((generatedBullet: string) => ({
      id: uuidv4(),
      text: generatedBullet,
    }))
  } catch (parseError) {
    console.error('JSON parse error for section ID:', sectionId, parseError)
    throw new BulletGenerationError({
      field: 'openai',
      message: `Failed to parse tool call JSON for section ID ${sectionId}`,
      type: 'ai_generation',
    })
  }

  if (newBullets.length !== missingCount) {
    console.warn(
      `Expected ${missingCount} bullets for section ID ${sectionId}, got ${newBullets.length}`
    )
    // TODO: possibly implement manual bullet generation as fallback in the future
  }

  const finalBullets: BulletPoint[] = [
    ...existingBullets,
    ...newBullets.slice(0, missingCount),
  ]

  if (finalBullets.length !== settings.bulletsPerExperienceBlock) {
    console.error(
      `Final bullet count for section ID ${sectionId}: Expected ${settings.bulletsPerExperienceBlock}, got ${finalBullets.length}`
    )
    throw new BulletGenerationError({
      field: 'openai',
      message: `Expected ${settings.bulletsPerExperienceBlock} bullets, got ${finalBullets.length} for section ID ${sectionId}`,
      type: 'ai_generation',
    })
  }

  return finalBullets
}

export const generateBulletPoints = async (
  workExperience: ExperienceBlockData[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  settings: AppSettings,
  projects?: ProjectBlockData[]
) => {
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
    // TODO: re-exmine this to account for variable char limit inputs
    const max_tokens = totalBullets * 100 + 2500 // 2500 for structure

    const completion = await openai.chat.completions.create({
      model: settings.languageModel,
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
      console.error(
        'No tool call in completion:',
        JSON.stringify(completion, null, 2)
      )
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
      console.error('Empty experience bullets:', toolResult)
      throw new BulletGenerationError({
        field: 'openai',
        message: 'Bullet generation failed: Empty experience bullets',
        type: 'ai_generation',
      })
    }

    // Handle missing bullets for work experience
    for (let exp of toolResult.experience_bullets) {
      if (exp.bullets.length < settings.bulletsPerExperienceBlock) {
        const experience = workExperience.find((w) => w.id === exp.id)
        if (!experience) {
          console.error(`Experience ID ${exp.id} not found in workExperience`)
          throw new BulletGenerationError({
            field: 'client',
            message: `Experience ID ${exp.id} not found`,
            type: 'missing_data',
          })
        }

        // Temporary bandaid fix to ensure bullet formatting is consistent

        const formattedBullets = exp.bullets.map((bullet) => ({
          id: uuidv4(),
          text: bullet,
        }))

        exp.bullets = await (
          await generateSectionBulletPoints(
            exp.id,
            {
              type: 'experience',
              description: experience.description,
            },
            formattedBullets,
            jobDescriptionAnalysis,
            openai,
            settings
          )
        )?.map((bullet: BulletPoint) => bullet.text)
      }
    }

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

    // Handle missing bullets for projects
    for (let proj of toolResult.project_bullets) {
      if (proj.bullets.length < settings.bulletsPerProjectBlock) {
        const project = projects?.find((p) => p.id === proj.id)
        if (!project) {
          console.error(`Project ID ${proj.id} not found in projects`)
          throw new BulletGenerationError({
            field: 'client',
            message: `Project ID ${proj.id} not found`,
            type: 'missing_data',
          })
        }

        // Temporary bandaid fix to ensure bullet formatting is consistent

        const formattedBullets = proj.bullets.map((bullet) => ({
          id: uuidv4(),
          text: bullet,
        }))

        proj.bullets = await (
          await generateSectionBulletPoints(
            proj.id,
            {
              type: 'project',
              description: project.description,
            },
            formattedBullets,
            jobDescriptionAnalysis,
            openai,
            settings
          )
        )?.map((bullet: BulletPoint) => bullet.text)
      }
    }

    // Final validation for experiences
    toolResult.experience_bullets.forEach((exp) => {
      if (exp.bullets.length !== settings.bulletsPerExperienceBlock) {
        console.error(
          `Final validation failed for experience ID ${exp.id}: Expected ${settings.bulletsPerExperienceBlock} bullets, got ${exp.bullets.length}`
        )
        throw new BulletGenerationError({
          field: 'openai',
          message: `Expected ${settings.bulletsPerExperienceBlock} bullets, got ${exp.bullets.length} for experience ID ${exp.id}`,
          type: 'ai_generation',
        })
      }
    })

    // Final validation for projects
    toolResult.project_bullets.forEach((proj) => {
      if (proj.bullets.length !== settings.bulletsPerProjectBlock) {
        console.error(
          `Final validation failed for project ID ${proj.id}: Expected ${settings.bulletsPerProjectBlock} bullets, got ${proj.bullets.length}`
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

// TODO: consider manual bullet generation as a last resort fallback
