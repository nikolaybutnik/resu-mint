import { JobDescriptionAnalysis } from '@/app/api/analyze-job-description/route'
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
        .join('\n      ')
    : 'None identified'
}
</hard_skills>
<soft_skills>
${
  jobDescriptionAnalysis.skillsRequired?.soft?.length
    ? jobDescriptionAnalysis.skillsRequired.soft
        .map((skill) => `• ${skill}`)
        .join('\n      ')
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
  projects?: ProjectBlockData[]
) => {
  const formattedWorkExperience = formatWorkExperienceForAI(workExperience)
  const formattedProjects = formatProjectsForAI(projects || [])
  const formattedJobDescription = formatJobDescriptionForAI(
    jobDescriptionAnalysis
  )
  return `
Generate tailored bullet points for work experiences and projects using the "generate_resume_bullets" tool.

<CRITICAL_NOTES>
IMPORTANT REQUIREMENTS:
- WORK EXPERIENCE BULLETS: You MUST generate EXACTLY ${numBulletsPerExperience} bullets for EACH WORK EXPERIENCE 
- PROJECT BULLETS: You MUST generate EXACTLY ${numBulletsPerProject} bullets for EACH PROJECT
- These are DIFFERENT requirements - do NOT confuse them!

<WORK_EXPERIENCE> contains professional job roles (e.g., ${
    workExperience?.length && workExperience[0]?.jobTitle
      ? workExperience[0].jobTitle
      : 'Front-End Developer'
  }) with employment details.
<PROJECTS> contains side/personal projects (e.g., ${
    projects?.length && projects[0]?.title
      ? projects[0].title
      : 'Project Compass'
  }).

IGNORE the number of input bullet points or formatting (e.g., 3 bullets); only the content matters.
For entries with sparse content, split tasks or highlight technologies/impact to reach the required number of bullets.
</CRITICAL_NOTES>

<RULES>
- Never fabricate data, metrics, or skills.
- Use exact technology names (e.g., "React", not "Angular").
- Include metrics only if stated; else, focus on qualitative impact.
- Generate EXACTLY ${numBulletsPerExperience} bullets per work experience, ${numBulletsPerProject} per project.
- Each bullet ≤${maxCharsPerBullet} characters.
- Use present tense for "- Present" roles, past tense otherwise.
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
1. Tailor bullets to JOB_ANALYSIS, using hard/soft skills (2–3 keyword mentions max per entire document) only if they match the user's experience/projects. Do not force unrelated skills.
2. Incorporate contextual_technologies, if present, only when relevant to the user's experience or projects.
3. Personalize bullets using company context (name, description) to align with the employer's mission.
4. Follow STAR method (Situation, Task, Action, Result) for each bullet, prioritizing measurable results.
5. For sparse content, split details or highlight technologies, impact, or collaboration to meet bullet count.
6. Sharpen verbs (e.g., "Built" → "Engineered") and add technical specificity.
7. Maximize impact, using 90-100% of ${maxCharsPerBullet} characters.
</INSTRUCTIONS>

<OUTPUT>
{
  "experience_bullets": [
    { "id": "<id>", "bullets": ["<bullet>", ...] } // Exactly ${numBulletsPerExperience} bullets
  ],
  "project_bullets": [
    { "id": "<id>", "bullets": ["<bullet>", ...] } // Exactly ${numBulletsPerProject} bullets
  ]
}
</OUTPUT>

<EXAMPLE>
Input (Work Experience): 
"• Engineered a React e-commerce front-end, ensuring WCAG-compliant accessibility, boosting engagement by 15%.
• Implemented secure e-commerce features, ensuring PCI-compliant payment flows via Viax.io platform.
• Drove a 15% increase in user engagement by implementing lazy loading, optimizing rendering, and collaborating with UX/UI designers."
Output (6 bullets):
- Engineered React e-commerce UI, enhancing responsiveness for Solink’s retail clients (React, Collaboration).
- Ensured WCAG compliance via axe-core, improving accessibility for diverse users (Problem-solving).
- Optimized rendering with lazy loading, boosting engagement by 15% per heatmap data (React).
- Secured PCI-compliant payment flows, enabling seamless B2C transactions (JavaScript).
- Collaborated with UX designers to streamline flows, supporting Solink’s analytics goals (Collaboration).
- Deployed features to AWS, ensuring scalable infrastructure for Solink’s platform (AWS, Problem-solving).
Incorrect:
- Built React UI, improved speed by 20%. // Fabricated metric
- Added TypeScript features. // Unmentioned skill
- Generated 4 bullets. // Wrong count
</EXAMPLE>

<VERIFICATION>
FINAL CHECK - These are different requirements:
1. Work Experience: EXACTLY ${numBulletsPerExperience} bullets per experience item
2. Projects: EXACTLY ${numBulletsPerProject} bullets per project item
3. All bullets ≤${maxCharsPerBullet} characters

If any bullets are missing, add more detailed points. If too many, combine related points.
</VERIFICATION>
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
