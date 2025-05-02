export const generateResumeBulletPointsPrompt = (
  experience: string,
  jobDescription: string,
  numBulletsPerExperience: number,
  maxCharsPerBullet: number
) => `
CRITICAL INSTRUCTION: NEVER FABRICATE ANY INFORMATION. Only use skills, achievements, and metrics EXPLICITLY stated in the candidate's experience.

I need tailored resume bullet points based on this job description and candidate's experience.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S EXPERIENCE:
${experience}

INSTRUCTIONS:
1. EXTRACT job titles from the experience
2. CREATE ${numBulletsPerExperience} bullet points for each job title
3. TAILOR each bullet point to match the job description requirements as per requirements below

REQUIREMENTS:
- Each bullet point must directly address specific requirements from the job description
- Begin each bullet with a strong action verb relevant to the job requirements
- Include metrics/percentages ONLY when explicitly stated in the experience
- Ensure each bullet is unique and highlights different job-relevant skills
- Maximum ${maxCharsPerBullet} characters per bullet point
- Follow STAR format (Situation, Task, Action, Result)
- Focus on integrating hard skills first, work in complimentary soft skills where makes sense
- Use exact keywords from the job description when possible
- Only include skills/achievements with evidence in the candidate's experience
- If there aren't enough relevant skills or achievements, create generalized bullet points without inventing specifics

EXAMPLE OF GOOD ALIGNMENT:
Experience mentions: "Improved customer onboarding process"
Job description requires: "experience with UX design"
✓ "Redesigned customer onboarding process, applying UX principles to reduce friction points"
✗ "Redesigned customer onboarding process, increasing conversion by 25%" (invented metric)

Use the generate_resume_bullets function to provide properly structured output.

FINAL REMINDER: DO NOT INVENT OR ADD ANY METRICS, PERCENTAGES, OR ACHIEVEMENTS THAT ARE NOT EXPLICITLY STATED IN THE CANDIDATE'S EXPERIENCE. When in doubt, be general rather than specific.
`
