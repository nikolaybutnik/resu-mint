import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'

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

    // TODO: section keys to update will be passed by the client

    const prompt = `
  Generate ${numBulletsPerExperience} resume bullet points tailored specifically to the following job description:

  $$$ JOB DESCRIPTION START $$$
  ${jobDescription}
  $$$ JOB DESCRIPTION END $$$

  Based on this candidate's experience:

  $$$ EXPERIENCE START $$$
  ${experience}
  $$$ EXPERIENCE END $$$

  JOB ALIGNMENT INSTRUCTIONS (HIGHEST PRIORITY):
  - First, carefully analyze the job description and extract ALL key requirements, skills, and qualifications.
  - For each extracted requirement, find corresponding evidence in the candidate's experience.
  - EVERY bullet point MUST directly address at least one specific requirement from the job description.
  - Use exact keywords and terminology from the job description whenever possible.
  - Prioritize hard skills and technical requirements first, then soft skills.
  - Only mention skills/achievements that are evidenced in the candidate's experience.

  BULLET POINT FORMATION:
  - Structure each bullet as: [SITUATION/TASK] + [ACTION with job-relevant skill] + [RESULT that demonstrates job fit]
  - Each bullet must begin with a strong action verb relevant to the job description.
  - Include specific metrics and percentages from the experience when available.
  - Ensure each bullet is unique and highlights different job-relevant skills.
  - Keep each bullet concise and at or under ${maxCharsPerBullet} characters.
  - Generate exactly ${numBulletsPerExperience} bullets for each section of experience.

  EXAMPLE OF GOOD ALIGNMENT:
  Job description requires "experience with data analysis and SQL"
  Good bullet: "Leveraged SQL to analyze customer data, identifying trends that increased retention by 15%"
  Bad bullet: "Managed team projects and improved communication" (generic, not aligned)

  Format your response as follows:
  [
    {"EXACT_JOB_TITLE": ["BULLET 1", "BULLET 2", ...]},
    {"EXACT_JOB_TITLE": ["BULLET 1", "BULLET 2", ...]},
    ...
  ]
      `

    // Notes:
    // one token is approximately 4 characters (including spaces)
    // a word is usually 1 - 3 tokens
    // 100 characters is approximately 25 tokens
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: numBulletsPerExperience * 100,
    })

    const rawBulletPoints =
      completion.choices[0].message.content?.trim() || '[]'
    let sections: { [key: string]: string[] }[] = []

    try {
      const cleanJson = (input: string): string => {
        return input
          .replace(/```json\n?|\n?```/g, '')
          .replace(/\/\/.*?\n|\/\*.*?\*\//g, '')
          .replace(/^\s*|\s*$/g, '')
          .replace(/\n\s*/g, '')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}')
      }

      const cleanedBulletPoints = cleanJson(rawBulletPoints)
      const parsed: { [key: string]: string[] }[] =
        JSON.parse(cleanedBulletPoints)

      try {
        if (Array.isArray(parsed)) {
          sections = parsed
            .filter((section) => {
              const [key, value] = Object.entries(section)[0] || []
              if (!key || !Array.isArray(value)) return false
              return true
            })
            .map((section) => {
              const [key, value] = Object.entries(section)[0]
              const cleanKey = key.trim()
              const cleanValue = (value as string[])
                .map((item) => item.trim())
                .filter((item) => item)
              return { [cleanKey]: cleanValue }
            })
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return NextResponse.json(
          { errors: { server: 'Failed to parse AI response' } },
          { status: 500 }
        )
      }

      if (!sections.length) {
        return NextResponse.json(
          { errors: { server: 'Unable to generate bullet points.' } },
          { status: 500 }
        )
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { errors: { server: 'Failed to parse AI response' } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: result.data, generatedSections: sections },
      { status: 200 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { errors: { server: 'Failed to generate bullet points' } },
      { status: 500 }
    )
  }
}
