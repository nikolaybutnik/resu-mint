import { ExperienceBlockData } from '@/components/EditableExperienceBlock/EditableExperienceBlock'

const formatWorkExperienceForAI = (
  workExperience: ExperienceBlockData[]
): string => {
  if (!workExperience || workExperience.length === 0) {
    return 'No work experience provided.'
  }

  const sortedExperience = [...workExperience].sort((a, b) => {
    const aYear = parseInt(
      a.endDate.isPresent ? new Date().getFullYear().toString() : a.endDate.year
    )
    const bYear = parseInt(
      b.endDate.isPresent ? new Date().getFullYear().toString() : b.endDate.year
    )

    if (aYear !== bYear) return bYear - aYear

    if (a.endDate.isPresent) return -1
    if (b.endDate.isPresent) return 1

    const monthOrder = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    }

    return (
      monthOrder[b.endDate.month as keyof typeof monthOrder] -
      monthOrder[a.endDate.month as keyof typeof monthOrder]
    )
  })

  return sortedExperience
    .map((exp, index) => {
      const formattedDuration = exp.endDate.isPresent
        ? `${exp.startDate.month} ${exp.startDate.year} - Present`
        : `${exp.startDate.month} ${exp.startDate.year} - ${exp.endDate.month} ${exp.endDate.year}`

      // TODO: implement when bullet locking is implemented
      // const existingBullets =
      //   exp.bulletPoints.length > 0
      //     ? `\nExisting bullet points:\n${exp.bulletPoints
      //         .map((point) => `• ${point}`)
      //         .join('\n')}`
      //     : ''

      return `
<position_${index + 1}>
<id>
${exp.id}
</id>
<position>
${exp.jobTitle}
</position>
<company>
${exp.companyName}
</company>
<location>
${exp.location}
</location>
<duration>
${formattedDuration}
</duration>
<description>
${exp.description}
</description>
</position_${index + 1}>
`
    })
    .join('\n---\n')
}

export const generateResumeBulletPointsPrompt = (
  workExperience: ExperienceBlockData[],
  jobDescription: string,
  numBulletsPerExperience: number,
  maxCharsPerBullet: number
) => {
  const formattedWorkExperience = formatWorkExperienceForAI(workExperience)

  return `
You are a professional resume writer. Generate tailored resume bullet points for each work experience based on the job description, using the "generate_resume_bullets" tool.

**CRITICAL**: NEVER fabricate information. Only use skills, achievements, and metrics EXPLICITLY stated in the work experience.

<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>

<WORK_EXPERIENCE>
${formattedWorkExperience}
</WORK_EXPERIENCE>

<INSTRUCTIONS>
1. Analyze the <JOB_DESCRIPTION> to identify key skills and requirements.
2. For each <WORK_EXPERIENCE>, generate exactly ${numBulletsPerExperience} bullet points, each up to ${maxCharsPerBullet} characters.
3. Use the STAR format (Situation, Task, Action, Result) with quantifiable results when stated.
4. TENSE RULE - STRICT: Check the <duration></duration> tag for each position:
   - If it ends with "- Present" → Use present tense (e.g., "Developing", "Leading")
   - If it has an end date → Use past tense (e.g., "Developed", "Led")
5. Incorporate job description keywords for ATS optimization (max 3 repetitions per keyword).
6. Use the experience ID from each <id> tag as the id property in the output.
7. CRITICAL: Generated bullets MUST align with the <JOB_DESCRIPTION> and <WORK_EXPERIENCE>.
8: CRITICAL: Use keywords and exact key phrases (defined as a string of around 3 words) from the <JOB_DESCRIPTION> in the generated bullets when possible. You must do everything you can to achieve maximum keyword alignment to the <JOB_DESCRIPTION>.
</INSTRUCTIONS>

<OUTPUT>
Return the bullet points in the "generate_resume_bullets" tool with the JSON structure:
{
  "experience_bullets": {
    "id": <experience_id>,
    "bullets": ["bullet 1", "bullet 2", ..., "bullet ${numBulletsPerExperience}"]
  }
}
</OUTPUT>

<EXAMPLE_TOOL_CALL_OUTPUT>
{
  "experience_bullets": {
    "id": "2dce1db3-61df-4af1-be28-ecdb837f3fdf"
    "bullets": [
      "Developed real-time inventory dashboard using JavaScript, enabling 15% faster stock updates for 200 retail clients",
      "Optimized Node.js backend queries, reducing API response time by 30% and enhancing user experience",
      "Led API integration with third-party logistics, cutting delivery scheduling errors by 25%"
    ]
  }
}
</EXAMPLE_TOOL_CALL_OUTPUT>

Generate the bullet points and return them in the specified JSON structure via the "generate_resume_bullets" tool.
`
}
