import { JobDescriptionAnalysis } from '@/lib/types/api'
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
    technologies?: string[]
    description: string
    existingBullets: BulletPoint[]
  },
  jobDescriptionAnalysis: JobDescriptionAnalysis,
  numBullets: number,
  maxCharsPerBullet: number
) => {
  const hardSkills = jobDescriptionAnalysis.skillsRequired.hard.join(', ')
  const softSkills = jobDescriptionAnalysis.skillsRequired.soft.join(', ')
  const technologies = section.technologies?.join(', ')
  const formattedSection = formatSectionForAI(section)
  const example = generateExamplesForLength(maxCharsPerBullet)

  return `
You are generating bullet points for a personal project section. You MUST only write about features, technologies, and achievements that are explicitly mentioned in the <SECTION> content below.

CRITICAL ANTI-HALLUCINATION RULES:
1. READ THE SECTION FIRST: Before writing any bullet, carefully read the <SECTION> description
2. CONTENT-ONLY RESTRICTION: You can ONLY mention features, technologies, implementations, and results that are explicitly described in the <SECTION>
3. NO INFERENCE: Do not infer or assume additional features, technologies, or project capabilities
4. KEYWORD ALIGNMENT: Use keywords from <KEYWORDS> ONLY if they directly match what's already described in <SECTION>
5. VERIFICATION CHECK: Before finalizing each bullet, ask yourself: "Is every claim in this bullet explicitly supported by the <SECTION> description?"

FORBIDDEN BEHAVIORS:
❌ Adding features not mentioned in <SECTION> (e.g., if section doesn't mention "user authentication", don't include it)
❌ If existing bullet points are talking about a specific feature/technology, your generated bullet MUST be unique
❌ Inferring technologies from keywords that aren't used in <SECTION>
❌ Assuming standard project features or capabilities
❌ Creating metrics or achievements not stated in <SECTION>

SECTION CONTENT TO BASE BULLETS ON:
<SECTION>
${formattedSection}
</SECTION>

PROJECT-SPECIFIC REQUIREMENTS:
- Focus on what you built, developed, implemented, or engineered
- Highlight technical achievements and problem-solving approaches
- Emphasize personal ownership and learning outcomes
- Showcase innovation and creative solutions

GENERATION REQUIREMENTS:
- Generate EXACTLY ${numBullets} bullets
- Target length: ${Math.floor(
    maxCharsPerBullet * 0.85
  )}-${maxCharsPerBullet} characters
- PERFECT LENGTH EXAMPLE: "${example}"
- Use action verbs fitting for personal projects: Built, Developed, Engineered, Implemented, Optimized, Created, Designed
- Follow STAR format when possible (Situation, Task, Action, Result)

KEYWORDS FOR ALIGNMENT (use only if already present in section):
Hard Skills: ${hardSkills}
Soft Skills: ${softSkills}
Utilized Technologies (must match section content): ${technologies}

Remember: While you're optimizing for keyword inclusion, every keyword and feature in the bullet you generate MUST be traceable back to the <SECTION> content above. Focus on the actual work you did on this project, not what projects of this type typically include.
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
  const example = generateExamplesForLength(maxCharsPerBullet)

  return `
You are generating bullet points for a work experience section. You MUST only write about tasks, technologies, and achievements that are explicitly mentioned in the <SECTION> content below.

CRITICAL ANTI-HALLUCINATION RULES:
1. READ THE SECTION FIRST: Before writing any bullet, carefully read the <SECTION> description
2. CONTENT-ONLY RESTRICTION: You can ONLY mention tasks, technologies, results, and activities that are explicitly described in the <SECTION>
3. NO INFERENCE: Do not infer or assume additional responsibilities, technologies, or tasks
4. KEYWORD ALIGNMENT: Use keywords from <KEYWORDS> ONLY if they directly match what's already described in <SECTION>
5. VERIFICATION CHECK: Before finalizing each bullet, ask yourself: "Is every claim in this bullet explicitly supported by the <SECTION> description?"

FORBIDDEN BEHAVIORS:
❌ Adding tasks not mentioned in <SECTION> (e.g., if section doesn't mention "managing Linux environments", don't include it)
❌ If existing bullet points are talking about a specific task/technology, your generated bullet MUST be unique
❌ Inferring technologies from keywords that aren't used in <SECTION>
❌ Assuming standard responsibilities for a job title
❌ Creating metrics or achievements not stated in <SECTION>

SECTION CONTENT TO BASE BULLETS ON:
<SECTION>
${formattedSection}
</SECTION>

GENERATION REQUIREMENTS:
- Generate EXACTLY ${numBullets} bullets
- Target length: ${Math.floor(
    maxCharsPerBullet * 0.85
  )}-${maxCharsPerBullet} characters
- PERFECT LENGTH EXAMPLE: "${example}"
- Use action verbs: Delivered, Engineered, Optimized, Designed, Integrated, Enhanced
- Follow STAR format when possible

KEYWORDS FOR ALIGNMENT (use only if already present in section):
Hard Skills: ${hardSkills}
Soft Skills: ${softSkills}

Remember: While you're optimizing for keyword inclusion, every keyword in the bullet you generate MUST be traceable back to the <SECTION> content above.
`
}
