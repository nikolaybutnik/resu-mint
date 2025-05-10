export const generateResumeBulletPointsTool = (
  numBullets: number,
  maxChars: number
) => ({
  type: 'function' as const,
  function: {
    name: 'generate_resume_bullets',
    description: `Generate ${numBullets} resume bullet points per work experience.`,
    parameters: {
      type: 'object',
      properties: {
        experience_bullets: {
          type: 'array',
          description: `Array of objects with experience ID and ${numBullets} STAR-format bullet points.`,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Experience ID.' },
              bullets: {
                type: 'array',
                description: `Array of ${numBullets} STAR-format bullet points, each ≤${maxChars} chars.`,
                items: { type: 'string' },
              },
            },
            required: ['id', 'bullets'],
          },
        },
      },
      required: ['experience_bullets'],
    },
  },
})
