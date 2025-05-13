export const generateResumeBulletPointsTool = (
  numExperienceBullets: number,
  numProjectBullets: number,
  maxChars: number
) => ({
  type: 'function' as const,
  function: {
    name: 'generate_resume_bullets',
    description: `Generate resume bullet points for both work experience and projects.`,
    parameters: {
      type: 'object',
      properties: {
        experience_bullets: {
          type: 'array',
          description: `Array of objects with experience ID and ${numExperienceBullets} STAR-format bullet points.`,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Experience ID.' },
              bullets: {
                type: 'array',
                description: `Array of ${numExperienceBullets} STAR-format bullet points, each ≤${maxChars} chars.`,
                items: { type: 'string' },
              },
            },
            required: ['id', 'bullets'],
          },
        },
        project_bullets: {
          type: 'array',
          description: `Array of objects with project ID and ${numProjectBullets} STAR-format bullet points.`,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Project ID.' },
              bullets: {
                type: 'array',
                description: `Array of ${numProjectBullets} STAR-format bullet points focused on technologies, each ≤${maxChars} chars.`,
                items: { type: 'string' },
              },
            },
            required: ['id', 'bullets'],
          },
        },
      },
      required: ['experience_bullets', 'project_bullets'],
    },
  },
})

export const generateJobDescriptionAnalysisTool = () => ({
  type: 'function' as const,
  function: {
    name: 'generate_job_description_analysis',
    description:
      'Analyzes a job description and returns structured data with skills, title, summary, instructions, location, company details, and contextual technologies.',
    parameters: {
      type: 'object',
      properties: {
        skillsRequired: {
          type: 'object',
          properties: {
            hard: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Technical skills/tools explicitly required, e.g., ["React", "TypeScript"]',
            },
            soft: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Non-technical skills, e.g., ["Collaboration", "Communication"]',
            },
          },
          required: ['hard', 'soft'],
        },
        jobTitle: {
          type: 'string',
          description: 'Exact job title, e.g., "Senior Developer (Front End)"',
        },
        jobSummary: {
          type: 'string',
          description:
            'Concise summary of role and responsibilities, 100-150 words',
        },
        specialInstructions: {
          type: 'string',
          description:
            'Application requirements, e.g., "Submit portfolio to hiring@lightspeed.com", or empty string if none',
        },
        location: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['remote', 'hybrid', 'on-site'],
              description: 'Primary work arrangement',
            },
            details: {
              type: 'string',
              description:
                'Clarifications, e.g., "Flexible/hybrid remote work options"',
            },
            listedLocation: {
              type: 'string',
              description: 'Raw location from posting, e.g., "Canada"',
            },
          },
          required: ['type', 'details', 'listedLocation'],
        },
        companyName: {
          type: 'string',
          description: 'Exact company name, e.g., "Lightspeed"',
        },
        companyDescription: {
          type: 'string',
          description:
            'Brief company summary (50-100 words) based on the job posting, covering mission, industry, or focus',
        },
        contextualTechnologies: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Technologies mentioned in the tech stack or environment but not explicitly required, e.g., ["AWS", "Docker", "Kafka"]',
        },
      },
      required: [
        'skillsRequired',
        'jobTitle',
        'jobSummary',
        'specialInstructions',
        'location',
        'companyName',
        'companyDescription',
        'contextualTechnologies',
      ],
    },
  },
})
