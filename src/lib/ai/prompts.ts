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
1. STRICT CHARACTER LIMIT: Each bullet point MUST be LESS THAN OR EQUAL TO ${maxCharsPerBullet} characters - this is a HARD CEILING. Count every character (including spaces) to ensure you don't exceed this limit.
2. For each <WORK_EXPERIENCE>, generate exactly ${numBulletsPerExperience} bullet points.
3. CREATIVE REWRITING: Rephrase and restructure the original text while maintaining factual accuracy:
   - Keep all skills, technologies, and metrics mentioned
   - Use your own wording and structure to present the information more effectively
   - Focus on impact and relevance to the job description
4. IMPROVE ON ORIGINAL: Don't just copy the original wording - enhance it:
   - Sharpen the action verbs (e.g., "Created" → "Engineered" or "Spearheaded")
   - Clarify technical implementations (e.g., "web app" → "React-based dashboard with real-time updates")
   - Connect technologies to their business impact more explicitly
5. TECHNICAL PRECISION: Show the purpose behind technical choices:
   - BAD: "Used Angular"
   - GOOD: "Built responsive UI with Angular to handle complex data visualization needs"
6. NO VAGUE STATEMENTS: Every bullet must include specific technical details and measurable impact:
   - BAD: "Collaborated with UX/UI to refine user flows, optimizing loading and rendering"
   - GOOD: "Partnered with UX/UI team to implement lazy-loading components and image optimization, reducing page load time by 40% and increasing user retention"
7. MAINTAIN FACTUAL ACCURACY: Use only technologies, achievements, and metrics mentioned in the original
8. TENSE RULE: Present tense for current jobs, past tense for previous roles
9. PRIORITY - MAXIMIZE CHARACTER USAGE WHILE RESPECTING THE LIMIT:
   - Each bullet MUST use 90-100% of the available ${maxCharsPerBullet} characters
   - NEVER exceed the ${maxCharsPerBullet} character limit for any reason
   - Count characters for each bullet before finalizing it
   - Every bullet MUST be a complete, grammatically correct sentence
   - If hitting character limit requires awkward phrasing, restructure the sentence
10. ATS OPTIMIZATION: Naturally incorporate relevant keywords from the job description
</INSTRUCTIONS>

<EXAMPLES OF GOOD ALIGNMENT>
Original text: "Modernized legacy workflows for U.S. and Mexico manufacturing plants by designing a production-grade Angular web application, driving 10% operational efficiency gains."

❌ TOO VAGUE: "Modernized workflows through web app development, driving 10% operational efficiency gains."
✅ CONCISE & SPECIFIC: "Modernized workflows by implementing real-time Angular-based dashboard, driving 10% efficiency gains."

Original text: "Optimized Angular front-end performance with NgRx state management and modular architecture, reducing UI latency by 20% through streamlined asynchronous workflows."

❌ TOO VAGUE: "Optimized Angular front-end with NgRx, reducing latency by 20%."
✅ CONCISE & SPECIFIC: "Optimized Angular front-end with NgRx state management, reducing UI latency by 20% through improved async workflows."

Original text: "Elevated software quality and delivery speed by increasing test coverage from 15% to 70%, cutting production bugs by 25%."

❌ TOO VAGUE: "Increased test coverage and reduced bugs."
✅ CONCISE & SPECIFIC: "Expanded test coverage from 15% to 70%, cutting production bugs by 25% and accelerating release cycles."
</EXAMPLES OF GOOD ALIGNMENT>
`
}
