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
      Generate ${numBulletsPerExperience} resume bullet points per each section on experience based on the following:

      $$$ EXPERIENCE START $$$
      ${experience}
      $$$ EXPERIENCE END $$$

      $$$ JOB DESCRIPTION START $$$
      ${jobDescription}
      $$$ JOB DESCRIPTION END $$$

      IMPORTANT: PROCESS FOR FORMING BULLET POINTS
      - First, scan the job description and pull out all required soft and hard skills.
      - Then, scan the experience and pull out all the skills that are relevant to the job description.
      - For each bullet point, make sure to include at least one skill from the job description and one skill from the experience.
      - The goal is to have each bullet point align as closely as possible with the job description.
      - If you cannot find any skills that align, make sure not to invent any skills that aren't explicitly stated in user's experience.
      - In the above situation, lean on soft skills and whatever can be reasonably inferred from the user's experience.
      - You must ALWAYS return the exact number of bullet points requested.
      - Ensure that each bullet point features unique skills.
      - Ensure that each bullet points follows the [SITUATION] [TASK] [ACTION] [RESULT] format.
      - If a user specified percentages, ensure to include them in the bullet points.
      - Each bullet should be concise, professional, and no longer than ${maxCharsPerBullet} characters.
      - [TESTING PURPOSES] If the user sends gibberish, just make up some job titles and bullets to go along with it.
      - Format your response as follows:
        REQUIRED FORMAT:
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
