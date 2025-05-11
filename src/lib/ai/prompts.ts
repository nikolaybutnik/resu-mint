import { ExperienceBlockData } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { ProjectBlockData } from '@/components/Projects/EditableProjectBlock/EditableProjectBlock'

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

const formatProjectsForAI = (projects: ProjectBlockData[]): string => {
  if (!projects || projects.length === 0) {
    return 'No projects provided.'
  }

  return projects
    .map((project, index) => {
      const dateRange = project.endDate.isPresent
        ? `${project.startDate.month} ${project.startDate.year} - Present`
        : `${project.startDate.month} ${project.startDate.year} - ${project.endDate.month} ${project.endDate.year}`

      return `
<project_${index + 1}>
<id>
${project.id}
</id>
<title>
${project.title}
</title>
<duration>
${dateRange}
</duration>
<technologies>
${project.technologies?.length ? project.technologies.join(', ') : ''}
</technologies>
<description>
${project.description || ''}
</description>
</project_${index + 1}>
`
    })
    .join('\n---\n')
}

export const generateResumeBulletPointsPrompt = (
  workExperience: ExperienceBlockData[],
  jobDescription: string,
  numBulletsPerExperience: number,
  numBulletsPerProject: number,
  maxCharsPerBullet: number,
  projects?: ProjectBlockData[]
) => {
  const formattedWorkExperience = formatWorkExperienceForAI(workExperience)
  const formattedProjects = formatProjectsForAI(projects || [])

  return `
You're a resume writer generating bullets for work experiences AND projects using the "generate_resume_bullets" tool.

<CRITICAL RULES>
- NEVER fabricate information
- DO use metrics from source text; NEVER invent them
- NEVER substitute technologies (e.g., don't change "Angular" to "React")
- Technology names must match the original EXACTLY
- For experiences: ${numBulletsPerExperience} bullets each
- For projects: ${numBulletsPerProject} bullets each
</CRITICAL RULES>

<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>

<WORK_EXPERIENCE>
${formattedWorkExperience}
</WORK_EXPERIENCE>

<PROJECTS>
${formattedProjects}
</PROJECTS>

<TECHNOLOGY ACCURACY>
- ONLY use technologies EXPLICITLY stated in the original content
- NEVER substitute one technology for another even if similar
- CHECK all technology names against the source before submitting
</TECHNOLOGY ACCURACY>

<METRICS USAGE>
- DO use metrics explicitly stated in the original text
- ACTIVELY SEARCH for and include existing metrics
- NEVER invent or estimate metrics not in the source
- If no metrics exist, focus on qualitative impact
</METRICS USAGE>

<INSTRUCTIONS>
1. CHARACTER LIMIT: Each bullet must be ≤${maxCharsPerBullet} chars (hard ceiling)

2. CONTENT SEPARATION:
   - Work experiences: ${numBulletsPerExperience} bullets each
   - Projects: ${numBulletsPerProject} bullets each
   
3. IMPROVE ORIGINAL CONTENT:
   - Keep all skills, technologies, and metrics mentioned
   - Sharpen verbs (e.g., "Created" → "Engineered")
   - Add technical specificity
   - Connect technologies to business impact
   
4. EXPERIENCE BULLETS:
   - Focus on accomplishments and impact
   - Highlight skills relevant to job description
   
5. PROJECT BULLETS:
   - Emphasize technologies exactly as listed
   - Focus on implementation details
   - Explain HOW technologies were used
   
6. TENSE: Present for positions marked '- Present' in <duration>, past otherwise

7. MAXIMIZE IMPACT:
   - Use 90-100% of available ${maxCharsPerBullet} characters
   - Every bullet must be complete and grammatical
   - Naturally incorporate job description keywords
</INSTRUCTIONS>

<OUTPUT FORMAT>
TWO arrays:
1. "experience_bullets": One entry per work experience, each with EXACTLY ${numBulletsPerExperience} bullets
2. "project_bullets": One entry per project, each with EXACTLY ${numBulletsPerProject} bullets
</OUTPUT FORMAT>

<EXAMPLES>
Original: "Modernized legacy workflows using Angular, driving 10% efficiency gains."
✅ GOOD: "Modernized legacy workflows by implementing Angular-based dashboard, driving 10% efficiency gains."
❌ BAD: "Modernized workflows using React, driving 10% efficiency gains." (Technology changed)
❌ BAD: "Modernized workflows using Angular, driving 20% efficiency gains." (Metric changed)
</EXAMPLES>
`
}
