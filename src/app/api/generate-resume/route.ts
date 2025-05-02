import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { generateResumeBulletPointsTool } from '@/lib/ai/tools'
import { generateResumeBulletPointsPrompt } from '@/lib/ai/prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Schema mirrors frontend
const formSchema = z.object({
  experience: z
    .string()
    .min(10, 'Experience must be at least 10 characters')
    .nonempty('Experience is required'),
  jobDescription: z
    .string()
    .min(10, 'Job description must be at least 10 characters')
    .nonempty('Job description is required'),
  numBulletsPerExperience: z
    .number()
    .min(1, 'Number of bullets must be at least 1')
    .max(10, 'Number of bullets cannot exceed 10'),
  maxCharsPerBullet: z
    .number()
    .min(50, 'Max characters must be at least 50')
    .max(200, 'Max characters cannot exceed 200'),
})

type FormFields = z.infer<typeof formSchema>
type JobSection = {
  title: string
  bullet_points: string[]
}

type ToolResponse = {
  job_sections: JobSection[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = formSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ errors: result.error.issues }, { status: 400 })
    }

    const {
      experience,
      jobDescription,
      numBulletsPerExperience,
      maxCharsPerBullet,
    } = result.data as FormFields
    const tools = [
      generateResumeBulletPointsTool(
        numBulletsPerExperience,
        maxCharsPerBullet
      ),
    ]
    const prompt = generateResumeBulletPointsPrompt(
      experience,
      jobDescription,
      numBulletsPerExperience,
      maxCharsPerBullet
    )

    // Notes:
    // one token is approximately 4 characters (including spaces)
    // a word is usually 1 - 3 tokens
    // 100 characters is approximately 25 tokens
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: numBulletsPerExperience * 100,
      tools,
      tool_choice: {
        type: 'function',
        function: { name: 'generate_resume_bullets' },
      },
    })

    const toolCall = completion.choices[0].message.tool_calls?.[0]

    if (!toolCall) {
      return NextResponse.json(
        { errors: { server: 'Failed to generate resume bullets' } },
        { status: 500 }
      )
    }

    const toolResult = JSON.parse(toolCall.function.arguments) as ToolResponse

    if (!toolResult.job_sections || !Array.isArray(toolResult.job_sections)) {
      return NextResponse.json(
        { errors: { server: 'Failed to generate resume bullets' } },
        { status: 500 }
      )
    }

    const sections = toolResult.job_sections.map((section) => ({
      [section.title]: section.bullet_points,
    }))

    return NextResponse.json(
      { data: result.data, generatedSections: sections },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { errors: { server: 'Failed to generate resume bullets' } },
      { status: 500 }
    )
  }
}
