export const generateResumeBulletPointsTool = (
  numBullets: number,
  maxChars: number
) => ({
  type: 'function' as const,
  function: {
    name: 'generate_resume_bullets',
    description:
      'Generate tailored resume bullet points based on job description and experience',
    parameters: {
      type: 'object',
      properties: {
        job_sections: {
          type: 'array',
          description: 'Array of job sections with titles and bullet points',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Job title extracted from experience',
              },
              bullet_points: {
                type: 'array',
                description: `${numBullets} bullet points tailored to the job description`,
                items: {
                  type: 'string',
                  description: `Resume bullet point of max ${maxChars} characters`,
                },
              },
            },
            required: ['title', 'bullet_points'],
          },
        },
      },
      required: ['job_sections'],
    },
  },
})
