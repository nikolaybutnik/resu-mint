import { JobDescriptionAnalysis } from '@/lib/types/api'
import { BulletPoint } from '@/lib/types/projects'

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
- contextualTechnologies: List technologies mentioned in the job posting but not explicitly stated as a requirement (e.g., "AWS", "Docker" as a nice ot have).
- salaryRange: Extract the salary range as listed in the job posting. Can be a range or a single value, e.g., "$100,000 - $120,000" or "$100,000". Return empty string if not listed.
</INSTRUCTIONS>

<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>
  `
}

const formatSectionForAI = (section: {
  id: string
  title: string
  description: string
  existingBullets: BulletPoint[]
  technologies?: string[]
}) => {
  return `
  <title>
  ${section.title}
  </title>
  <description>
  ${section.description}
  </description>
  ${
    section.existingBullets.length
      ? `<existing_bullets>\n${section.existingBullets
          .map((b) => `- ${b.text}`)
          .join('\n')}\n</existing_bullets>`
      : ''
  }
  `
}

export const generateProjectBulletPointsPrompt = (
  section: {
    id: string
    title: string
    technologies: string[]
    description: string
    existingBullets: BulletPoint[]
  },
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
) => {
  const hardSkills = jobDescriptionAnalysis.skillsRequired.hard.join(', ')
  const softSkills = jobDescriptionAnalysis.skillsRequired.soft.join(', ')
  const technologies = section.technologies.join(', ')
  const formattedSection = formatSectionForAI(section)

  return `
Generate ${numBullets} bullet points for project in <SECTION> using the "generate_section_bullets" tool

<RULES>
1. Generate EXACTLY ${numBullets} bullets for <SECTION>
2. Each bullet ABSOLUTELY MUST use 85-100% of ${maxCharsPerBullet} characters
3. Align bullets you generate with <KEYWORDS> using <SECTION> for context. You must attempt to use each keyword, but only if it matches with <SECTION>. NEVER use a hard skill keyword not backed up by <SECTION>
4. If existing bullets are provided, you MUST ensure the new bullet(s) are DISTINCT. Make sure that your use of keywords is distinct from existing bullets, as well as the subject of the bullet point. Example: if an existing bullet mentions integrating a chatbot with dnd-kit, your generated bullet must talk about another technology related to the chatbot, or another topic
5. NEVER fabricate tasks, metrics, or skills; they must be used only if present in <SECTION>
6. Use STAR (Situation, Task, Action, Result)
7. Use action verbs fitting for a personal project. (e.g. Built, Developed, Engineered, Implemented, Optimized)
</RULES>

<KEYWORDS>
Hard Skills (First priority for keyword matching): ${hardSkills}
Soft Skills (Second priority): ${softSkills}
Utilized Technologies (Use if aligns with Hard Skills): ${technologies}
</KEYWORDS>

<SECTION>
${formattedSection}
</SECTION>
  `
}

export const generateExperienceBulletPointsPrompt = (
  section: {
    id: string
    title: string
    description: string
    existingBullets: BulletPoint[]
  },
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
) => {
  const hardSkills = jobDescriptionAnalysis.skillsRequired.hard.join(', ')
  const softSkills = jobDescriptionAnalysis.skillsRequired.soft.join(', ')
  const formattedSection = formatSectionForAI(section)

  return `
Generate ${numBullets} bullet points for work experience in <SECTION> using the "generate_section_bullets" tool.

<RULES>
1. Generate EXACTLY ${numBullets} bullets for <SECTION>.
2. Each bullet ABSOLUTELY MUST use 85-100% of ${maxCharsPerBullet} characters
3. Align bullets you generate with <KEYWORDS> using <SECTION> for context. You must attempt to use each keyword, but only if it matches with <SECTION>. NEVER use a hard skill keyword not backed up by <SECTION>
4. If existing bullets are provided, you MUST ensure the new bullet(s) are DISTINCT. Make sure that your use of keywords is distinct from existing bullets, as well as the subject of the bullet point. Example: if an existing bullet mentions integrating a chatbot with dnd-kit, your generated bullet must talk about another technology related to the chatbot, or another topic
5. NEVER fabricate tasks, metrics, or skills; they must be used only if present in <SECTION>
6. Use STAR (Situation, Task, Action, Result)
7. Use action verbs fitting for a professional work experience. (e.g. Delivered, Engineered, Optimized, Designed, Integrated, Enhanced)
</RULES>

<KEYWORDS>
Hard Skills (First priority for keyword matching): ${hardSkills}
Soft Skills (Second priority): ${softSkills}
</KEYWORDS>

<SECTION>
${formattedSection}
</SECTION>
`
}
