import { ExperienceBlockData } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { ProjectBlockData } from '@/components/Projects/EditableProjectBlock/EditableProjectBlock'

const formatWorkExperienceForAI = (
  workExperience: ExperienceBlockData[]
): string => {
  if (!workExperience || workExperience.length === 0) {
    return 'No work experience provided.'
  }

  return workExperience
    .map((exp, index) => {
      const formattedDuration = exp.endDate.isPresent
        ? `${exp.startDate.month} ${exp.startDate.year} - Present`
        : `${exp.startDate.month} ${exp.startDate.year} - ${exp.endDate.month} ${exp.endDate.year}`

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
- For work <WORK_EXPERIENCE>: generate STRICTLY ${numBulletsPerExperience} bullets each - NO EXCEPTIONS
- For projects <PROJECTS>: generate STRICTLY ${numBulletsPerProject} bullets each - NO EXCEPTIONS
- MUST RETURN EXACTLY ${numBulletsPerExperience} bullets per experience and ${numBulletsPerProject} per project
</CRITICAL RULES>

<NOTE>
Important: For each work experience listed under <WORK_EXPERIENCE>, you MUST generate exactly ${numBulletsPerExperience} bullet points, no matter how short or long the description is. Similarly, for each project under <PROJECTS>, you MUST generate exactly ${numBulletsPerProject} bullet points. If the description is sparse, split the information into more granular points or highlight different aspects of the work, such as technologies used, implementation details, impact, or collaboration. Do not let the number of original bullet points influence your output.
</NOTE>

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
   - Work experiences: ${numBulletsPerExperience} bullets each - ALWAYS
   - Projects: ${numBulletsPerProject} bullets each - ALWAYS
   - When content is sparse: split details into multiple bullets, highlight different aspects of the same work
   - NEVER return fewer bullets than required, even if content seems limited
   - You must generate exactly ${numBulletsPerExperience} bullets for each work experience and exactly ${numBulletsPerProject} bullets for each project, without exception.
   
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
1. "experience_bullets": One entry per work experience, each MUST contain EXACTLY ${numBulletsPerExperience} bullet points - no more, no less
2. "project_bullets": One entry per project, each MUST contain EXACTLY ${numBulletsPerProject} bullet points - no more, no less
</OUTPUT FORMAT>

<EXAMPLES>
Original: "Modernized legacy workflows using Angular, driving 10% efficiency gains."
✅ GOOD: "Modernized legacy workflows by implementing Angular-based dashboard, driving 10% efficiency gains."
❌ BAD: "Modernized workflows using React, driving 10% efficiency gains." (Technology changed)
❌ BAD: "Modernized workflows using Angular, driving 20% efficiency gains." (Metric changed)
</EXAMPLES>

<FINAL VERIFICATION>
Before submitting, count that each work experience has EXACTLY ${numBulletsPerExperience} bullets and each project has EXACTLY ${numBulletsPerProject} bullets, at or under ${maxCharsPerBullet} characters each.
If any entry has too few bullets:
- Split existing content into more granular points
- Highlight different aspects of the same technologies or accomplishments
- Focus on skills, implementation, impact, collaboration, or process separately

If any entry has too many bullets:
- Combine related points
- Remove the least impressive bullets

If any entry has bullets over ${maxCharsPerBullet} characters:
- Rework the bullet to be at most ${maxCharsPerBullet} characters

Double-check that you have generated exactly ${numBulletsPerExperience} bullets for each work experience and ${numBulletsPerProject} for each project. If not, adjust your output accordingly before submitting.
</FINAL VERIFICATION>
`
}

export const generateJobDescriptionAnalysisPrompt = (
  jobDescription: string
) => {
  return `
<INSTRUCTIONS>
Analyze the job description and return structured data using the "generate_job_description_analysis" tool. Follow these rules:
- skillsRequired.hard: List technical skills/tools explicitly required (e.g., "React", "TypeScript"). Exclude technologies only mentioned as part of the stack or environment.
- skillsRequired.soft: List non-technical skills (e.g., "Collaboration", "Problem-solving").
- jobTitle: Extract the exact job title.
- jobSummary: Summarize role and responsibilities in 80 - 100 words, focusing on duties and goals.
- specialInstructions: Note application requirements (e.g., "Submit portfolio"). Return empty string if none.
- location.type: Classify as "remote", "hybrid", or "on-site" based on primary arrangement.
- location.details: Clarify nuances (e.g., "Flexible/hybrid remote work options").
- location.listedLocation: Quote raw location (e.g., "Canada").
- companyName: Extract the exact company name (e.g., "Google").
- companyDescription: Summarize the company's mission, industry, or focus in 50-100 words based on the posting.
- contextualTechnologies: List technologies mentioned in the tech stack or deployment environment but not explicitly required (e.g., "AWS", "Docker"). Include tools used in the company’s infrastructure or mentioned as context.
</INSTRUCTIONS>

<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>
  `
}
