import { MONTHS } from './constants'
import z from 'zod'
import { LanguageModel } from './types/settings'

const urlValidator = (errorMessage = 'Must be a valid URL') => {
  return z.union([
    z.string().refine(
      (val) => {
        if (val === '') return false // Empty strings handled by the second option

        try {
          // Check for trailing invalid punctuation
          if (/[!@#$%^&*(){}[\]:;<>,.?~\\]$/.test(val)) {
            return false
          }

          // Handle protocol
          let urlToValidate = val

          // Check for malformed protocol (like https:example.com without //)
          if (val.match(/^https?:/i) && !val.match(/^https?:\/\//i)) {
            return false
          }

          // If missing protocol entirely, prepend it
          if (!val.match(/^https?:\/\//i)) {
            urlToValidate = `https://${val}`
          }

          // Extract domain part for strict validation
          let domain = ''
          if (urlToValidate.includes('://')) {
            domain = urlToValidate.split('://')[1].split('/')[0]

            // Remove port number if present
            if (domain.includes(':')) {
              domain = domain.split(':')[0]
            }
          }

          // Strictly validate domain format
          // Valid domains only contain letters, numbers, hyphens, and dots as separators
          // Each label (part between dots) must start and end with letter/number
          if (domain) {
            // Check for invalid characters
            if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
              return false
            }

            // Check each domain label (part between dots)
            const labels = domain.split('.')
            for (const label of labels) {
              // Each label must start and end with alphanumeric character
              if (!/^[a-zA-Z0-9].*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(label)) {
                return false
              }

              // No consecutive hyphens
              if (label.includes('--')) {
                return false
              }
            }

            // Must have at least two labels, and last label must be at least 2 chars
            if (labels.length < 2 || labels[labels.length - 1].length < 2) {
              return false
            }
          }

          return true
        } catch (e: unknown) {
          if (e instanceof Error) {
            console.error('Error validating URL:', val)
          }
          return false
        }
      },
      { message: errorMessage }
    ),
    z.literal(''),
  ])
}

const bulletPointSchema = z.object({
  id: z.string().uuid(),
  text: z
    .string()
    .min(1, 'Bullet point cannot be empty')
    .max(500, 'Bullet point must be 500 characters or less'),
  isLocked: z.boolean().optional().default(false),
})

export const bulletTextValidationSchema = z
  .object({
    text: z.string().transform((val) => val.trim()),
    maxCharsPerBullet: z.number().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.text === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bullet text cannot be empty',
        path: ['emptyBullet'],
      })
    }

    if (data.text.length > data.maxCharsPerBullet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Your character target is ${data.maxCharsPerBullet}. For best results, keep each bullet consistent in length.`,
        path: ['bulletTooLong'],
      })
    }
  })

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export const personalDetailsSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+\d+|\d+)$/.test(val),
      'Phone number can only contain numbers, and an optional + at the beginning'
    )
    .refine(
      (val) => !val || (val.length >= 10 && val.length <= 15),
      'Phone number must be 10 to 15 characters'
    ),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or less')
    .optional(),
  linkedin: urlValidator('Please enter a valid LinkedIn URL')
    .optional()
    .refine(
      (val) => !val || val === '' || val.toLowerCase().includes('linkedin.com'),
      'Please enter a valid LinkedIn URL'
    ),
  github: urlValidator('Please enter a valid GitHub URL')
    .optional()
    .refine(
      (val) => !val || val === '' || val.toLowerCase().includes('github.com'),
      'Please enter a valid GitHub URL'
    ),
  website: urlValidator('Please enter a valid website URL').optional(),
})

const monthSchema = z.union([z.enum(monthLabels), z.literal('')]).optional()

export const startDateSchema = z.object({
  month: monthSchema,
  year: z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
})

export const endDateSchema = z
  .object({
    isPresent: z.boolean(),
    month: monthSchema,
    year: z.string(),
  })
  .refine(
    (data) => {
      if (data.isPresent) return true

      return /^\d{4}$/.test(data.year)
    },
    {
      message: 'Year must be four digits (e.g., 2020) when not Present',
      path: ['year'],
    }
  )

// Education allows the dates to be optional
export const educationStartDateSchema = z.object({
  month: monthSchema,
  year: z.union([
    z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
    z.literal(''),
  ]),
})

export const educationEndDateSchema = z.object({
  month: monthSchema,
  year: z.union([
    z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
    z.literal(''),
  ]),
})

export const experienceBlockSchema = z
  .object({
    id: z.string().uuid(),
    title: z
      .string()
      .min(1, 'Job title is required')
      .max(100, 'Job title must be 100 characters or less'),
    startDate: startDateSchema,
    endDate: endDateSchema,
    companyName: z
      .string()
      .min(1, 'Company name is required')
      .max(500, 'Company name must be 500 characters or less'),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional(),
    location: z
      .string()
      .min(1, 'Location is required')
      .max(100, 'Location must be 100 characters or less'),
    bulletPoints: z.array(bulletPointSchema).optional().default([]),
    isIncluded: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.endDate.isPresent || !data.endDate.year) {
        return true
      }

      if (!data.startDate.month && !data.endDate.month) {
        const startYear = parseInt(data.startDate.year)
        const endYear = parseInt(data.endDate.year)
        return endYear >= startYear
      }

      const startDate = new Date(
        parseInt(data.startDate.year),
        MONTHS.find((m) => m.label === data.startDate.month)?.num || 0,
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        MONTHS.find((m) => m.label === data.endDate.month)?.num || 0,
        1
      )
      return endDate >= startDate
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )

export const projectBlockSchema = z
  .object({
    id: z.string().uuid(),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be 100 characters or less'),
    startDate: startDateSchema,
    endDate: endDateSchema,
    technologies: z.array(z.string()).default([]),
    link: urlValidator().default(''),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional(),
    bulletPoints: z.array(bulletPointSchema).default([]),
    isIncluded: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      // If present, no need to check date comparisons
      if (data.endDate.isPresent) {
        return true
      }

      // Check if months are provided consistently
      const startMonthSpecified = !!data.startDate.month
      const endMonthSpecified = !!data.endDate.month

      // If both months are specified or both are not, proceed with normal comparison
      // Otherwise, this will fail and be caught by the next refinement
      if (startMonthSpecified !== endMonthSpecified) {
        return true // Let the next refinement handle this specific case
      }

      // If both months are undefined, just compare years
      if (!startMonthSpecified && !endMonthSpecified) {
        const startYear = parseInt(data.startDate.year)
        const endYear = parseInt(data.endDate.year)
        return endYear >= startYear
      }

      // Both months are defined, compare full dates
      const startDate = new Date(
        parseInt(data.startDate.year),
        MONTHS.find((m) => m.label === data.startDate.month)?.num || 0,
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        MONTHS.find((m) => m.label === data.endDate.month)?.num || 0,
        1
      )
      return endDate >= startDate
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // If present, skip this validation
      if (data.endDate.isPresent) {
        return true
      }

      // Check if months are provided consistently
      const startMonthSpecified = !!data.startDate.month
      const endMonthSpecified = !!data.endDate.month

      return startMonthSpecified === endMonthSpecified
    },
    {
      message: '',
      path: ['endDate'],
    }
  )
  .superRefine((data, ctx) => {
    // Skip validation if using "Present"
    if (data.endDate.isPresent) {
      return
    }

    // Check if one month is specified but the other isn't
    const startMonthSpecified = !!data.startDate.month
    const endMonthSpecified = !!data.endDate.month

    if (startMonthSpecified && !endMonthSpecified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Month is required when start month is specified',
        path: ['endDate.month'],
      })
    } else if (!startMonthSpecified && endMonthSpecified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Month is required when end month is specified',
        path: ['startDate.month'],
      })
    }
  })

export const settingsSchema = z.object({
  bulletsPerExperienceBlock: z.number().int().min(1).max(10),
  bulletsPerProjectBlock: z.number().int().min(1).max(10),
  maxCharsPerBullet: z.number().int().min(100).max(500),
  languageModel: z.nativeEnum(LanguageModel),
})

export const analyzeJobDescriptionRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  jobDescription: z.string().min(1, 'Job description is required'),
  settings: settingsSchema,
})

export const jobDescriptionAnalysisSchema = z.object({
  skillsRequired: z.object({
    hard: z
      .array(z.string())
      .describe('Technical skills/tools, e.g., ["React", "TypeScript"]'),
    soft: z
      .array(z.string())
      .describe(
        'Non-technical skills, e.g., ["Collaboration", "Communication"]'
      ),
  }),
  jobTitle: z
    .string()
    .describe('Exact job title, e.g., "Software Engineer II"'),
  jobSummary: z
    .string()
    .describe('Concise summary of role and responsibilities, 100-150 words'),
  specialInstructions: z
    .string()
    .describe(
      'Application requirements, e.g., "Submit portfolio to hiring@example.com", or empty string if none'
    ),
  location: z.object({
    type: z
      .enum(['remote', 'hybrid', 'on-site'])
      .describe('Primary work arrangement'),
    details: z
      .string()
      .describe(
        'Clarifications, e.g., "Remote, but requires quarterly on-site meetings"'
      ),
    listedLocation: z
      .string()
      .describe('Raw location from posting, e.g., "Ottawa, ON (Remote)"'),
  }),
  companyName: z.string().describe('Exact company name, e.g., "Google"'),
  companyDescription: z
    .string()
    .describe(
      'Brief company summary (50-100 words) based on the job posting, covering mission, industry, or focus'
    ),
  contextualTechnologies: z
    .array(z.string())
    .describe(
      'Technologies mentioned in the tech stack or environment but not explicitly mentioned as required, e.g., ["AWS", "Docker", "Kafka"]'
    ),
  salaryRange: z
    .string()
    .describe('Salary range as listed in the job posting')
    .optional()
    .default(''),
})

export const resumeMintRequestSchema = z.object({
  sessionId: z.string(),
  personalDetails: personalDetailsSchema,
  workExperience: z.array(experienceBlockSchema),
  projects: z.array(projectBlockSchema),
  jobDescriptionAnalysis: jobDescriptionAnalysisSchema,
  settings: settingsSchema,
})

export const generateBulletsRequestSchema = z
  .object({
    sections: z
      .array(
        z.object({
          id: z.string().uuid('Invalid section ID'),
          type: z.enum(['project', 'experience']),
          title: z
            .string()
            .min(1, 'Title cannot be empty')
            .max(100, 'Title must be 100 characters or less'),
          technologies: z
            .array(
              z
                .string()
                .max(50, 'Each technology must be 50 characters or less')
            )
            .max(20, 'Too many technologies')
            .optional()
            .default([]),
          description: z
            .string()
            .max(2000, 'Description must be 2000 characters or less')
            .optional()
            .default(''),
          existingBullets: z.array(
            z.object({
              id: z.string().uuid('Invalid bullet ID'),
              text: z.string(),
              isLocked: z.boolean(),
            })
          ),
          targetBulletIds: z
            .array(z.string().uuid('Invalid target bullet ID'))
            .min(0),
        })
      )
      .min(1, 'At least one section is required'),
    jobDescriptionAnalysis: jobDescriptionAnalysisSchema,
    settings: settingsSchema,
    numBullets: z.number().int().min(1, 'numBullets must be at least 1'),
  })
  .superRefine((data, ctx) => {
    // Validate targetBulletIds: unique and not in existingBullets
    data.sections.forEach((section, sectionIndex) => {
      const bulletIds = new Set(section.existingBullets.map((b) => b.id))
      const targetIds = new Set(section.targetBulletIds)
      if (targetIds.size < section.targetBulletIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'targetBulletIds must be unique',
          path: [`sections`, sectionIndex, `targetBulletIds`],
        })
      }
      section.targetBulletIds.forEach((id, targetIndex) => {
        if (bulletIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'targetBulletIds must not overlap with existingBullets',
            path: [`sections`, sectionIndex, `targetBulletIds`, targetIndex],
          })
        }
      })
      // Ensure numBullets >= targetBulletIds.length if targetBulletIds provided
      if (
        section.targetBulletIds.length > 0 &&
        data.numBullets < section.targetBulletIds.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'numBullets must be at least targetBulletIds length when targetBulletIds is provided',
          path: [`numBullets`],
        })
      }
    })
  })

export const educationBlockSchema = z
  .object({
    id: z.string().uuid(),
    institution: z
      .string()
      .min(1, 'Institution name is required')
      .max(500, 'Institution name must be 500 characters or less'),
    degree: z
      .string()
      .min(1, 'Degree is required')
      .max(200, 'Degree must be 200 characters or less'),
    degreeStatus: z
      .union([z.enum(['completed', 'in-progress']), z.literal('')])
      .optional(),
    startDate: educationStartDateSchema.optional(),
    endDate: educationEndDateSchema.optional(),
    location: z
      .string()
      .max(100, 'Location must be 100 characters or less')
      .optional(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional(),
    isIncluded: z.boolean().optional().default(true),
  })
  .transform((data) => {
    // Clean up empty date objects
    const cleanedData = { ...data }

    if (
      data.startDate &&
      data.startDate.month === '' &&
      data.startDate.year === ''
    ) {
      cleanedData.startDate = undefined
    }

    if (data.endDate && data.endDate.month === '' && data.endDate.year === '') {
      cleanedData.endDate = undefined
    }

    return cleanedData
  })
  .refine(
    (data) => {
      // If one date is provided, the other must also be provided
      const hasStartDate = data.startDate && data.startDate.year !== ''
      const hasEndDate = data.endDate && data.endDate.year !== ''

      if (hasStartDate && !hasEndDate) {
        return false
      }
      if (hasEndDate && !hasStartDate) {
        return false
      }

      return true
    },
    {
      message: 'Both start and end dates are required if either is provided',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // Skip date validation if either date is missing
      if (!data.startDate || !data.endDate) {
        return true
      }

      // Both dates exist at this point due to the guard above
      const startDate = data.startDate
      const endDate = data.endDate

      if (!endDate.year || endDate.year === '') {
        return true
      }

      // Check if months are provided consistently
      const startMonthSpecified = !!startDate.month
      const endMonthSpecified = !!endDate.month

      // If both months are specified or both are not, proceed with normal comparison
      // Otherwise, this will fail and be caught by the next refinement
      if (startMonthSpecified !== endMonthSpecified) {
        return true // Let the next refinement handle this specific case
      }

      if (!startDate.month && !endDate.month) {
        const startYear = parseInt(startDate.year)
        const endYear = parseInt(endDate.year)
        return endYear >= startYear
      }

      const startDateObj = new Date(
        parseInt(startDate.year),
        MONTHS.find((m) => m.label === startDate.month)?.num || 0,
        1
      )
      const endDateObj = new Date(
        parseInt(endDate.year),
        MONTHS.find((m) => m.label === endDate.month)?.num || 0,
        1
      )
      return endDateObj >= startDateObj
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // Skip validation if either date is missing
      if (!data.startDate || !data.endDate) {
        return true
      }

      // Check if months are provided consistently
      const startMonthSpecified = !!data.startDate.month
      const endMonthSpecified = !!data.endDate.month

      return startMonthSpecified === endMonthSpecified
    },
    {
      message: '',
      path: ['endDate'],
    }
  )
  .superRefine((data, ctx) => {
    // Check month-year consistency for start date
    if (
      data.startDate &&
      data.startDate.month &&
      (!data.startDate.year || data.startDate.year === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Year is required when month is specified',
        path: ['startDate', 'year'],
      })
    }

    // Check month-year consistency for end date
    if (
      data.endDate &&
      data.endDate.month &&
      (!data.endDate.year || data.endDate.year === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Year is required when month is specified',
        path: ['endDate', 'year'],
      })
    }

    // Skip cross-date validation if either date is missing
    if (!data.startDate || !data.endDate) {
      return
    }

    // Check if one month is specified but the other isn't
    const startMonthSpecified = !!data.startDate.month
    const endMonthSpecified = !!data.endDate.month

    if (startMonthSpecified && !endMonthSpecified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Month is required when start month is specified',
        path: ['endDate.month'],
      })
    } else if (!startMonthSpecified && endMonthSpecified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Month is required when end month is specified',
        path: ['startDate.month'],
      })
    }
  })

export const createPdfRequestSchema = z.object({
  personalDetails: personalDetailsSchema,
  experienceSection: z.array(experienceBlockSchema),
  projectSection: z.array(projectBlockSchema),
  educationSection: z.array(educationBlockSchema),
})

export const parseSectionSkillsRequestSchema = z.object({
  sectionDescriptions: z.string().min(1, 'Section descriptions are required'),
  settings: settingsSchema,
})

export const parseSectionSkillsResponseSchema = z.object({
  hardSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
})
