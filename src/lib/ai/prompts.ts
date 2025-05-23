import { JobDescriptionAnalysis } from '@/lib/types/api'
import { ExperienceBlockData } from '@/lib/types/experience'
import { BulletPoint, ProjectBlockData } from '@/lib/types/projects'

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

const formatJobDescriptionForAI = (
  jobDescriptionAnalysis: JobDescriptionAnalysis
): string => {
  return `
<job_title>
${jobDescriptionAnalysis.jobTitle || 'Not specified'}
</job_title>
<skills>
<hard_skills>
${
  jobDescriptionAnalysis.skillsRequired?.hard?.length
    ? jobDescriptionAnalysis.skillsRequired.hard
        .map((skill) => `• ${skill}`)
        .join('\n')
    : 'None identified'
}
</hard_skills>
<soft_skills>
${
  jobDescriptionAnalysis.skillsRequired?.soft?.length
    ? jobDescriptionAnalysis.skillsRequired.soft
        .map((skill) => `• ${skill}`)
        .join('\n')
    : 'None identified'
}
</soft_skills>
</skills>
<contextual_technologies>
${
  jobDescriptionAnalysis.contextualTechnologies?.length
    ? jobDescriptionAnalysis.contextualTechnologies
        .map((tech) => `• ${tech}`)
        .join('\n      ')
    : 'None identified'
}
</contextual_technologies>
<company>
<name>
${jobDescriptionAnalysis.companyName || 'Unknown'}
</name>
<description>
${jobDescriptionAnalysis.companyDescription || 'No description available'}
</description>
</company>
  `
}

export const generateResumeBulletPointsPrompt = (
  workExperience: ExperienceBlockData[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBulletsPerExperience: number,
  numBulletsPerProject: number,
  maxCharsPerBullet: number,
  projects: ProjectBlockData[] = []
) => {
  const formattedWorkExperience = formatWorkExperienceForAI(workExperience)
  const formattedProjects = formatProjectsForAI(projects)
  const formattedJobDescription = formatJobDescriptionForAI(
    jobDescriptionAnalysis
  )

  return `
Generate bullet points for <WORK_EXPERIENCE> and <PROJECTS> using the "generate_resume_bullets" tool.

<RULES>
1. Generate EXACTLY ${numBulletsPerExperience} bullets per work experience, ${numBulletsPerProject} per project.
2. Base tasks and metrics ONLY on <WORK_EXPERIENCE> or <PROJECTS> (e.g., UI optimization, 15% engagement).
3. ONLY use <JOB_ANALYSIS> skills explicitly mentioned or directly tied to technologies/tasks in <WORK_EXPERIENCE> or <PROJECTS> (e.g., Python for FastAPI, JavaScript for React, not AWS unless mentioned).
4. DO NOT fabricate tasks, metrics, or skills; metrics must be explicitly stated in input (e.g., 15% engagement, not "significant improvement").
5. Each bullet MUST use 95-100% of ${maxCharsPerBullet} characters (e.g., 109-115 for 115) for maximum impact.
6. Use past tense for completed roles, present tense for ongoing ("- Present").
7. Ensure bullets are distinct from existing content in <WORK_EXPERIENCE> or <PROJECTS>.
8. Align with <JOB_ANALYSIS> company mission (e.g., Solink’s analytics).
9. Avoid vague terms (e.g., "strategic enhancements", "significant improvements"); use specific tasks/technologies from input.
</RULES>

<JOB_ANALYSIS>
${formattedJobDescription}
</JOB_ANALYSIS>

<WORK_EXPERIENCE>
${formattedWorkExperience}
</WORK_EXPERIENCE>

<PROJECTS>
${formattedProjects}
</PROJECTS>

<INSTRUCTIONS>
1. Extract only explicit tasks (e.g., UI optimization, microservices), metrics (e.g., 15% engagement), and technologies (e.g., React, FastAPI) from <WORK_EXPERIENCE> or <PROJECTS>.
2. Select <JOB_ANALYSIS> skills explicitly mentioned or directly tied to these technologies/tasks (e.g., Python for FastAPI, JavaScript for React, not AWS unless mentioned).
3. Generate ${numBulletsPerExperience} bullets per work experience, ${numBulletsPerProject} per project, using precise tasks/technologies from input, avoiding generic phrases.
4. MUST craft bullets using 95-100% of ${maxCharsPerBullet} characters with detailed, specific content, ensuring they are distinct and follow STAR method.
5. For sparse content, split tasks (e.g., UI vs. accessibility) or add specific details to reach 95-100% length.
</INSTRUCTIONS>

<EXAMPLES>
Correct:
Input (Work Experience): "Developed microservices with FastAPI, ensuring scalable back-end solutions. Engineered React UI, boosting engagement by 15%."
Output:
- Developed FastAPI microservices using Python, enabling highly scalable back-end solutions for Solink’s analytics-driven platform.
- Engineered React UI with JavaScript, boosting user engagement by 15% for Solink’s e-commerce analytics platform.
Note: Bullets MUST use 95-100% of ${maxCharsPerBullet} characters to maximize impact. Skills listed after bullets (e.g., Python) show <JOB_ANALYSIS> keywords tied to input technologies, not literal output.

Incorrect:
- Enhanced UI with strategic code, significantly improving load speeds. // Vague, unverified metric, too short
- Developed microservices with AWS, improving reliability by 25%. // Unmentioned AWS, fabricated metric
</EXAMPLES>

<VERIFICATION>
Note: Short or vague bullets reduce impact; prioritize specific, detailed content to reach 95-100% of ${maxCharsPerBullet} characters.
1. Confirm EXACTLY ${numBulletsPerExperience} bullets per work experience, ${numBulletsPerProject} per project.
2. Verify tasks and metrics ONLY from <WORK_EXPERIENCE> or <PROJECTS>.
3. Ensure <JOB_ANALYSIS> skills are tied to input technologies/tasks (e.g., Python for FastAPI, not AWS).
4. Reject bullets <95% of ${maxCharsPerBullet} characters (e.g., <109 for 115) or >${maxCharsPerBullet}; ensure distinctness.
5. Reject vague or unverified metrics (e.g., "significant improvement" unless input specifies).
6. Reject bullets using <JOB_ANALYSIS> skills not mentioned or tied to input (e.g., AWS for FastAPI).
7. Reject vague phrases (e.g., "strategic enhancements"); ensure specific tasks/technologies.
</VERIFICATION>

<OUTPUT>
{
  "experience_bullets": [{ "id": "<id>", "bullets": ["<bullet>", ...] }],
  "project_bullets": [{ "id": "<id>", "bullets": ["<bullet>", ...] }]
}
</OUTPUT>
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
- salaryRange: Extract the salary range as listed in the job posting. Can be a range or a single value, e.g., "$100,000 - $120,000" or "$100,000". Return empty string if not listed.
</INSTRUCTIONS>

<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>
  `
}

export const generateSectionBulletPointsPrompt = (
  section: {
    type: 'experience' | 'project'
    description: string
  },
  existingBullets: BulletPoint[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
) => {
  const formattedJobDescription = formatJobDescriptionForAI(
    jobDescriptionAnalysis
  )

  return `
Generate ${numBullets} bullet points for <SECTION_DESCRIPTION> using the "generate_section_bullets" tool.

<RULES>
1. Generate EXACTLY ${numBullets} bullet points.
2. Base tasks and metrics ONLY on <SECTION_DESCRIPTION> (e.g., UI optimization, 15% engagement).
3. ONLY use <JOB_ANALYSIS> skills explicitly mentioned or directly tied to technologies/tasks in <SECTION_DESCRIPTION> (e.g., JavaScript for React, not AWS unless mentioned).
4. DO NOT fabricate tasks, metrics, or skills; metrics must be explicitly stated in input (e.g., 15% engagement, not "significant improvement").
5. Each bullet MUST use 95-100% of ${maxCharsPerBullet} characters (e.g., 109-115 for 115) for maximum impact.
6. Use past tense for completed tasks, present tense for ongoing.
7. Ensure bullets are distinct from <EXISTING_BULLETS>.
8. Ensure bullets are keyword optimized, matching requirements from <JOB_ANALYSIS> to user's achievements in <SECTION_DESCRIPTION>.
9. Avoid vague terms (e.g., "strategic enhancements", "significant improvements"); use specific tasks/technologies from input.
</RULES>

<SECTION_DESCRIPTION>
${section.type === 'experience' ? 'TYPE: Work Experience' : 'TYPE: Project'}
${section.description}
</SECTION_DESCRIPTION>

<EXISTING_BULLETS>
${
  existingBullets.length
    ? existingBullets.map((b) => `- ${b.text}`).join('\n')
    : 'None'
}
</EXISTING_BULLETS>

<JOB_ANALYSIS>
${formattedJobDescription}
</JOB_ANALYSIS>

<INSTRUCTIONS>
1. Extract only explicit tasks (e.g., UI optimization), metrics (e.g., 15% engagement), and technologies (e.g., React) from <SECTION_DESCRIPTION>.
2. Select <JOB_ANALYSIS> skills explicitly mentioned or directly tied to these technologies/tasks (e.g., JavaScript for React, not AWS unless mentioned).
3. Generate ${numBullets} bullet points, using precise tasks/technologies from input, avoiding generic phrases.
4. MUST craft bullets using 95-100% of ${maxCharsPerBullet} characters with detailed, specific content, ensuring they are distinct and follow STAR method.
5. For sparse content, split tasks (e.g., UI vs. accessibility) or add specific details to reach 95-100% length.
6. If <EXISTING_BULLETS> are provided, you MUST ensure the new bullet(s) are DISTINCT from the existing bullets.
</INSTRUCTIONS>

<EXAMPLES>
Correct:
<SECTION_DESCRIPTION>: "Engineered a React e-commerce front-end, ensuring WCAG-compliant accessibility, boosting engagement by 15%."
<EXISTING_BULLETS>: 
- Engineered React front-end, boosting engagement by 15%.
Output:
- Ensured WCAG-compliant accessibility using JavaScript, enhancing Solink’s user interface for diverse audience engagement.
- Built modular React UI with TypeScript, enabling scalable e-commerce solutions for Solink’s analytics-driven platform.
Note: Bullets MUST use 95-100% of ${maxCharsPerBullet} characters to maximize impact. Skills listed after bullets (e.g., JavaScript) show <JOB_ANALYSIS> keywords tied to input technologies, not literal output.

Incorrect:
- Enhanced UI with strategic code, significantly improving load speeds. // Vague, unverified metric, too short
- Improved efficiency by 25% with AWS. // Fabricated metric, unrelated skill
</EXAMPLES>

<VERIFICATION>
Note: Short or vague bullets reduce impact; prioritize specific, detailed content to reach 95-100% of ${maxCharsPerBullet} characters.
1. Confirm EXACTLY ${numBullets} bullet points.
2. Verify tasks and metrics ONLY from <SECTION_DESCRIPTION>.
3. Ensure <JOB_ANALYSIS> skills are tied to input technologies/tasks (e.g., JavaScript for React, not AWS).
4. Reject bullets <95% of ${maxCharsPerBullet} characters (e.g., <109 for 115) or >${maxCharsPerBullet}; ensure distinctness.
5. Reject vague or unverified metrics (e.g., "significant improvement" unless input specifies).
6. Reject bullets using <JOB_ANALYSIS> skills not mentioned or tied to input (e.g., AWS for UI).
7. Reject vague phrases (e.g., "strategic enhancements"); ensure specific tasks/technologies.
</VERIFICATION>

<OUTPUT>
{
  "bullets": ["<bullet>", ...] // EXACTLY ${numBullets} bullets
}
</OUTPUT>
`
}

export const generateExperienceBulletPointsPrompt = (
  sections: {
    id: string
    title: string
    description: string
    existingBullets: BulletPoint[]
  }[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
) => {
  return `
Experience Test Prompt
`
}

export const generateProjectBulletPointsPrompt = (
  sections: {
    id: string
    title: string
    technologies: string[]
    description: string
    existingBullets: BulletPoint[]
  }[],
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
) => {
  return `
Project Test Prompt
`
}
