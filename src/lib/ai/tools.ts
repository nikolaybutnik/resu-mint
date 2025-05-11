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
