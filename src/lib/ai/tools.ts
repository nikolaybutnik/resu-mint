export const generateResumeBulletPointsTool = (
  bulletsPerExperience: number,
  bulletsPerProject: number,
  maxCharsPerBullet: number
) => ({
  type: 'function' as const,
  function: {
    name: 'generate_resume_bullets',
    description:
      'Generates bullet points for work experiences and projects based on provided data.',
    parameters: {
      type: 'object',
      properties: {
        experience_bullets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              bullets: {
                type: 'array',
                items: { type: 'string' },
                minItems: bulletsPerExperience,
                maxItems: bulletsPerExperience,
                description: `Exactly ${bulletsPerExperience} bullet points, each ≤${maxCharsPerBullet} characters`,
              },
            },
            required: ['id', 'bullets'],
          },
        },
        project_bullets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              bullets: {
                type: 'array',
                items: { type: 'string' },
                minItems: bulletsPerProject,
                maxItems: bulletsPerProject,
                description: `Exactly ${bulletsPerProject} bullet points, each ≤${maxCharsPerBullet} characters`,
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

export const generateSectionBulletPointsTool = (
  maxCharsPerBullet: number,
  numBullets: number
) => ({
  type: 'function' as const,
  function: {
    name: 'generate_section_bullets',
    description:
      'Generate bullet points for a project or work experience section of a resume.',
    parameters: {
      type: 'object',
      properties: {
        bullets: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 0,
            maxLength: maxCharsPerBullet,
            description:
              'A concise, action-oriented bullet point tailored to the job and section context. Return empty string ("") if insufficient context to generate accurate content.',
          },
          minItems: numBullets,
          maxItems: numBullets,
          description: `Exactly ${numBullets} bullet points, each under ${maxCharsPerBullet} characters. Use empty strings ("") for bullets lacking sufficient context.`,
        },
      },
      required: ['bullets'],
      additionalProperties: false,
    },
  },
})

export const generateJobDescriptionAnalysisTool = () => ({
  type: 'function' as const,
  function: {
    name: 'generate_job_description_analysis',
    description:
      'Analyzes a job description and returns structured data with skills, title, summary, instructions, location, company details, and contextual skills.',
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
        contextualSkills: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Technologies mentioned in the tech stack or environment but not explicitly required, e.g., ["AWS", "Docker", "Kafka"]',
        },
        salaryRange: {
          type: 'string',
          description:
            'Salary range as listed in the job posting. Can be a range or a single value, e.g., "$100,000 - $120,000" or "$100,000"',
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
        'contextualSkills',
        'salaryRange',
      ],
    },
  },
})

export const generateSkillSuggestionsTool = () => ({
  type: 'function' as const,
  function: {
    name: 'generate_skill_suggestions',
    description:
      'Generate skill suggestions based on user experience and job requirements',
    parameters: {
      type: 'object',
      properties: {
        hardSkillSuggestions: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 8,
          description:
            'Technical skills the user likely has based on their experience that are relevant to the job but not in their current skills list',
        },
        softSkillSuggestions: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 8,
          description:
            'Soft skills the user likely has based on their experience that are relevant to the job but not in their current skills list',
        },
      },
      required: ['hardSkillSuggestions', 'softSkillSuggestions'],
    },
  },
})

export const skillExtractionTool = () => ({
  type: 'function' as const,
  function: {
    name: 'extract_skills',
    description:
      "Extract hard and soft skills from content, excluding skills already in the user's current skills list",
    parameters: {
      type: 'object',
      properties: {
        hardSkills: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Technical abilities, tools, technologies, programming languages, frameworks, software, or technical systems found in the content (e.g., "React", "Python", "AWS", "Docker", "SQL", "Machine Learning")',
        },
        softSkills: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Interpersonal abilities, communication styles, work habits, leadership qualities, or problem-solving approaches found in the content (e.g., "Leadership", "Communication", "Problem-solving", "Collaboration")',
        },
      },
      required: ['hardSkills', 'softSkills'],
      additionalProperties: false,
    },
  },
})

export const skillCategorizationTool = () => ({
  type: 'function' as const,
  function: {
    name: 'categorize_skills',
    description:
      'Categorize skills into logical groups that are specifically tailored to match the requirements and priorities of the target job description',
    parameters: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description:
                  'The title/name of the skill category (e.g., "Programming Languages", "Frameworks", "Tools", "Soft Skills")',
              },
              skills: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of skills that belong to this category',
              },
            },
            required: ['title', 'skills'],
            additionalProperties: false,
          },
          description:
            'Array of skill categories tailored to the job description, each with a title and array of skills',
        },
      },
      required: ['categories'],
      additionalProperties: false,
    },
  },
})
