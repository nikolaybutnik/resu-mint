import { JobDescriptionAnalysis } from '@/lib/types/jobDetails'
import { BulletPoint } from '@/lib/types/projects'

const generateExamplesForLength = (maxChars: number): string => {
  const examples = {
    300: 'Led modernization of legacy monolithic Java system by decomposing it into scalable, containerized Spring Boot microservices, orchestrated via Kubernetes and deployed on AWS ECS. Automated CI/CD pipelines with Jenkins, achieving a 70% reduction in deployment time and improving system uptime to 99.9% (299 characters)',
    275: 'Architected a scalable, high-performance e-commerce platform using Next.js, GraphQL, and Prisma ORM; integrated Stripe for secure, multi-currency global payment processing, boosting conversion rates by 35% and reliably supporting 50,000+ active daily users with 99.8% uptime (274 characters)',
    250: 'Designed and deployed a scalable Kubernetes-based microservices architecture using Go and MongoDB; implemented end-to-end observability with Prometheus, Grafana, and custom metrics, achieving an 80% reduction in incident response and recovery time (247 characters)',
    225: 'Developed a real-time OpenAI API-based chatbot application using WebSocket and Node.js with Redis caching, optimizing message delivery to under 100ms, increasing user engagement by 45% across 10,000 active daily users (217 characters)',
    200: 'Implemented reactive state management with RxJS and NgRx in Angular, reducing redundant re-renders and data fetches, improving page load speed by 30% and enhancing responsiveness under heavy user load (200 characters)',
    175: 'Built scalable serverless AWS Lambda functions with TypeScript and DynamoDB, automating backend workflows to reduce processing time by 65% and cut infrastructure costs by 40% (174 characters)',
    150: 'Developed responsive React app with TypeScript, implementing Redux state management and achieving 40% performance improvement through code splitting (148 characters)',
    125: 'Built scalable Node.js API with PostgreSQL integration, reducing query response time by 60% through optimized indexing (118 characters)',
    100: 'Implemented automated testing suite using Cypress, achieving 95% code coverage and reducing bugs (96 characters)',
  }

  const closest = Object.keys(examples).reduce((prev, curr) =>
    Math.abs(parseInt(curr) - maxChars) < Math.abs(parseInt(prev) - maxChars)
      ? curr
      : prev
  )

  return examples[closest as unknown as keyof typeof examples]
}

export const generateJobDescriptionAnalysisPrompt = (
  jobDescription: string
): string => {
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
- contextualSkills: List technologies mentioned in the job posting but not explicitly stated as a requirement (e.g., "AWS", "Docker" as a nice ot have).
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
}): string => {
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
    technologies?: string[]
    description: string
    existingBullets: BulletPoint[]
  },
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
): string => {
  const hardSkills = jobDescriptionAnalysis.skillsRequired.hard.join(', ')
  const softSkills = jobDescriptionAnalysis.skillsRequired.soft.join(', ')
  const technologies = section.technologies?.join(', ')
  const formattedSection = formatSectionForAI(section)
  const example = generateExamplesForLength(maxCharsPerBullet)

  return `
Generate ${numBullets} unique bullets for personal project.

STRICT CONTENT RULES:
1. ONLY write about features/technologies/implementations EXPLICITLY mentioned in the section below
2. Each bullet MUST cover different aspects - no duplicating existing bullet topics
3. Each bullet MUST focus on a specific aspect of the work at a time, no mixing topics
4. Before writing each bullet, verify: "Is every claim supported by the section description?"
5. Do NOT assume standard project features or add capabilities not mentioned

SECTION (your ONLY source of truth):
${formattedSection}

LENGTH: ${Math.floor(maxCharsPerBullet * 0.85)}-${maxCharsPerBullet} characters
EXAMPLE: "${example}"

KEYWORDS (use when section supports): ${softSkills}, ${hardSkills}, ${technologies}

Pattern: "Built/Developed/Implemented + specific feature from section + technical outcome"
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
): string => {
  const hardSkills = jobDescriptionAnalysis.skillsRequired.hard.join(', ')
  const softSkills = jobDescriptionAnalysis.skillsRequired.soft.join(', ')
  const contextualSkills = jobDescriptionAnalysis.contextualSkills.join(', ')
  const formattedSection = formatSectionForAI(section)
  const example = generateExamplesForLength(maxCharsPerBullet)

  return `
Generate ${numBullets} unique bullets for work experience.

STRICT CONTENT RULES:
1. ONLY write about tasks/responsibilities/technologies EXPLICITLY mentioned in the section below
2. Each bullet MUST cover different aspects - no duplicating existing bullet topics  
3. Each bullet MUST focus on a specific aspect of the work at a time, no mixing topics
4. Before writing each bullet, verify: "Is every claim supported by the section description?"
5. Do NOT assume standard job responsibilities or add tasks not mentioned

SECTION (your ONLY source of truth):
${formattedSection}

LENGTH: ${Math.floor(maxCharsPerBullet * 0.85)}-${maxCharsPerBullet} characters
EXAMPLE: "${example}"

KEYWORDS (use when section supports): ${softSkills}, ${hardSkills}, ${contextualSkills}

Pattern: "Action + specific task from section + measurable result"
`
}

export const generateSkillSuggestionsPrompt = (
  jobAnalysis: JobDescriptionAnalysis,
  currentSkills: {
    hardSkills: { skills: string[] }
    softSkills: { skills: string[] }
  },
  userExperience: string[]
): string => {
  const jobSummary = jobAnalysis.jobSummary
  const jobHardSkills = jobAnalysis.skillsRequired.hard.join(', ')
  const jobSoftSkills = jobAnalysis.skillsRequired.soft.join(', ')
  const contextualSkills = jobAnalysis.contextualSkills.join(', ')

  const currentHardSkills = currentSkills.hardSkills.skills.join(', ')
  const currentSoftSkills = currentSkills.softSkills.skills.join(', ')

  const experienceText = userExperience.join('\n\n')

  return `
Analyze the user's experience below and suggest skills they likely have that are relevant to the target job, but not already in their current skills list.

JOB SUMMARY:
${jobSummary}

JOB REQUIREMENTS:
- Hard Skills: ${jobHardSkills}
- Soft Skills: ${jobSoftSkills}  
- Contextual Skills: ${contextualSkills}

CRITICAL: USER ALREADY HAS THESE SKILLS - DO NOT SUGGEST THEM:
- Hard Skills: ${currentHardSkills}
- Soft Skills: ${currentSoftSkills}

USER EXPERIENCE:
${experienceText}

TASK: Based on the user's experience, identify skills they likely possess that are:
1. Relevant to the job requirements above
2. NOT already in their current skills list  
3. Clearly demonstrated in their experience descriptions
4. Specific and actionable

Focus on skills that are directly mentioned or strongly implied by their work. Prioritize job-required skills over contextual ones.

Use the "generate_skill_suggestions" tool to return your suggestions.
`
}

export const generateSkillsExtractionPrompt = (
  contentToExtractFrom: string,
  currentSkills: {
    hardSkills: string[]
    softSkills: string[]
  }
): string => {
  const existingHardSkills = currentSkills.hardSkills.join(', ')
  const existingSoftSkills = currentSkills.softSkills.join(', ')

  return `
IMPORTANT: You are extracting NEW skills only. Do NOT extract any skills that already exist in the user's current skills list.

CURRENT SKILLS (EXCLUDE THESE FROM EXTRACTION):
- Hard Skills: ${existingHardSkills || 'None'}
- Soft Skills: ${existingSoftSkills || 'None'}

Extract all hard and soft skills from the content below using the "extract_skills" tool.

SKILL CLASSIFICATION RULES:
- Hard Skills: Technical abilities, tools, technologies, programming languages, frameworks, software, technical systems, methodologies, or technical processes (e.g., "React", "Python", "AWS", "Docker", "SQL", "Machine Learning", "Testing", "Automation", "CI/CD", "Agile")
- Soft Skills: ONLY interpersonal abilities, communication styles, work habits, leadership qualities, or behavioral competencies (e.g., "Leadership", "Communication", "Problem-solving", "Collaboration", "Time Management", "Adaptability", "Teamwork", "Critical Thinking", "Attention to Detail")

EXTRACTION RULES:
1. HARD SKILLS: ONLY extract skills that are EXPLICITLY mentioned or directly referenced in the content (e.g., "used React", "built with Python", "deployed on AWS", "implemented automation", "managed testing")
2. SOFT SKILLS: Can be extracted from explicit mentions OR inferred from demonstrated behaviors/actions (e.g., "led a team" → Leadership, "solved complex problems" → Problem-solving, "worked with stakeholders" → Communication)
3. CRITICAL: Before extracting any skill, check if it's already in the current skills list above
4. Be specific - prefer "React" over "Frontend Development", "AWS" over "Cloud Computing"
5. Normalize skill names (e.g., "JavaScript" not "JS", "Git" not "GitHub")
6. Avoid duplicates - if a skill appears multiple times, extract it only once
7. VALIDATION: If unsure whether something is hard or soft skill, default to hard skill (technical processes, methodologies, tools, etc. are typically hard skills)

CONTENT TO ANALYZE:
${contentToExtractFrom}

TASK: Extract all unique hard and soft skills from the content that are NOT already in the current skills list. Use the "extract_skills" tool to return your findings.
`
}

export const generateSkillCategorizationPrompt = (
  jobSummary: string,
  requiredSkills: {
    hard: string[]
    soft: string[]
    contextual: string[]
  },
  userSkills: {
    hard: string[]
    soft: string[]
  }
): string => {
  const requiredHardSkills = requiredSkills.hard.join(', ')
  const requiredSoftSkills = requiredSkills.soft.join(', ')
  const contextualSkills = requiredSkills.contextual.join(', ')
  const userHardSkills = userSkills.hard.join(', ')
  const userSoftSkills = userSkills.soft.join(', ')

  return `
<INSTRUCTIONS>
Categorize the user's skills to optimize their resume for the target job. Use the "categorize_skills" tool.

CRITICAL SKILL RULES:
1. HARD SKILLS: ONLY use skills from the user's hard skills list below. DO NOT create or add new hard skills.
2. SOFT SKILLS: AVOID soft skills categories. Only include soft skills if user has fewer than 4 relevant hard skills total. Soft skills are a last resort.
3. EXACT SPELLING MATCH: When user skill matches job requirement, use the exact spelling from job requirements:
   - User has "React" → Use "React.js" if job lists "React.js"
   - User has "JavaScript" → Use "JS" if job lists "JS"
4. PRIORITY ORDER: Hard skills → Contextual skills → Soft skills (avoid soft skills)

CATEGORIZATION RULES:
- FIRST PRIORITY: Include ALL user skills that exactly match job requirements
- SECOND PRIORITY: Include user skills that closely relate to job requirements
- LAST PRIORITY: Only include other user skills if they strengthen thin categories
- ABSOLUTE RULE: MINIMUM 2 skills per category - NEVER create single-skill categories
- If you cannot create at least 2 categories with 2+ skills each, combine categories more broadly
- MAXIMUM 3 categories total - focus on substantial, well-populated groups
- If a skill doesn't fit logically into an existing category, either expand the category or omit the skill

LOGICAL GROUPING REQUIREMENTS:
- Programming Languages: JavaScript, Python, Java, TypeScript, etc.
- Frameworks & Libraries: React, Next.js, Angular, Vue, Express, dnd-kit, etc.
- Development Tools: Git, Docker, VS Code, Webpack, etc.
- Cloud & Infrastructure: AWS, Azure, Kubernetes, etc.
- Databases: PostgreSQL, MongoDB, Redis, etc.
- DO NOT use vague categories like "Technical Skills" or "Development Technologies"
- DO NOT misplace skills (React is NOT a development tool, it's a framework)
- Categories must be semantically accurate and industry-standard

JOB SUMMARY:
${jobSummary}

USER'S SKILLS:
Hard Skills: ${userHardSkills || 'None'}
Soft Skills: ${userSoftSkills || 'None'}

JOB REQUIREMENTS:
Required Hard Skills: ${requiredHardSkills || 'None'}
Contextual Skills: ${contextualSkills || 'None'}
Required Soft Skills: ${requiredSoftSkills || 'None'}

TASK: Select and categorize user skills that match job requirements. Prioritize hard skills that align with the job.
`
}
