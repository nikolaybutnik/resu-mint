import { MONTHS } from './constants'
import z from 'zod'
import { LanguageModel, ResumeSection } from './types/settings'

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
  year: z.string(),
})

export const endDateSchema = z.object({
  isPresent: z.boolean(),
  month: monthSchema,
  year: z.string(),
})

// Education allows the dates to be completely optional
export const educationStartDateSchema = z
  .object({
    month: monthSchema,
    year: z.union([
      z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
      z.literal(''),
    ]),
  })
  .optional()

export const educationEndDateSchema = z
  .object({
    month: monthSchema,
    year: z.union([
      z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
      z.literal(''),
    ]),
  })
  .optional()

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
  .superRefine((data, ctx) => {
    if (data.endDate.isPresent) {
      // Only validate start year format
      if (!/^\d{4}$/.test(data.startDate.year)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start year must be four digits (e.g., 2020)',
          path: ['startDate'],
        })
      }
      return
    }

    // Priority 1: Format consistency
    // Treat undefined or '' as not specified
    const startMonthSpecified = data.startDate.month
      ? data.startDate.month.length > 0
      : false
    const endMonthSpecified = data.endDate.month
      ? data.endDate.month.length > 0
      : false

    if (startMonthSpecified !== endMonthSpecified) {
      if (startMonthSpecified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End month is required when start month is specified',
          path: ['endDate'],
        })
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start month is required when end month is specified',
          path: ['startDate'],
        })
      }
      return
    }

    // Priority 2: Year format and presence
    // Start year: always required and 4 digits
    if (!data.startDate.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start year is required',
        path: ['startDate'],
      })
      return
    }
    if (!/^\d{4}$/.test(data.startDate.year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start year must be four digits (e.g., 2020)',
        path: ['startDate'],
      })
      return
    }

    // End year: required and 4 digits (since not Present)
    if (!data.endDate.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End year is required when not Present',
        path: ['endDate'],
      })
      return
    }
    if (!/^\d{4}$/.test(data.endDate.year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End year must be four digits (e.g., 2020)',
        path: ['endDate'],
      })
      return
    }

    // Priority 3: Date validation
    const startYear = parseInt(data.startDate.year, 10)
    const endYear = parseInt(data.endDate.year, 10)

    let invalidDate = false

    if (!startMonthSpecified && !endMonthSpecified) {
      // Years only: end >= start (same allowed)
      invalidDate = endYear < startYear
    } else if (startMonthSpecified && endMonthSpecified) {
      // Months + years: end >= start (same month/year allowed)
      const startMonthNum =
        MONTHS.find((m) => m.label === data.startDate.month)?.num ?? 0
      const endMonthNum =
        MONTHS.find((m) => m.label === data.endDate.month)?.num ?? 0
      const startDate = new Date(startYear, startMonthNum, 1)
      const endDate = new Date(endYear, endMonthNum, 1)
      invalidDate = endDate < startDate
    }

    if (invalidDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date',
        path: ['endDate'],
      })
    }
  })

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
  .superRefine((data, ctx) => {
    if (data.endDate.isPresent) {
      // Only validate start year format
      if (!/^\d{4}$/.test(data.startDate.year)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start year must be four digits (e.g., 2020)',
          path: ['startDate'],
        })
      }
      return
    }

    // Priority 1: Format consistency
    // Treat undefined or '' as not specified
    const startMonthSpecified = data.startDate.month
      ? data.startDate.month.length > 0
      : false
    const endMonthSpecified = data.endDate.month
      ? data.endDate.month.length > 0
      : false

    if (startMonthSpecified !== endMonthSpecified) {
      if (startMonthSpecified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End month is required when start month is specified',
          path: ['endDate'],
        })
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start month is required when end month is specified',
          path: ['startDate'],
        })
      }
      return
    }

    // Priority 2: Year format and presence
    // Start year: always required and 4 digits
    if (!data.startDate.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start year is required',
        path: ['startDate'],
      })
      return
    }
    if (!/^\d{4}$/.test(data.startDate.year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start year must be four digits (e.g., 2020)',
        path: ['startDate'],
      })
      return
    }

    // End year: required and 4 digits (since not Present)
    if (!data.endDate.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End year is required when not Present',
        path: ['endDate'],
      })
      return
    }
    if (!/^\d{4}$/.test(data.endDate.year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End year must be four digits (e.g., 2020)',
        path: ['endDate'],
      })
      return
    }

    // Priority 3: Date validation (only if above pass)
    const startYear = parseInt(data.startDate.year, 10)
    const endYear = parseInt(data.endDate.year, 10)

    let invalidDate = false

    if (!startMonthSpecified && !endMonthSpecified) {
      // Years only: end >= start (same allowed)
      invalidDate = endYear < startYear
    } else if (startMonthSpecified && endMonthSpecified) {
      // Months + years: end >= start (same month/year allowed)
      const startMonthNum =
        MONTHS.find((m) => m.label === data.startDate.month)?.num ?? 0
      const endMonthNum =
        MONTHS.find((m) => m.label === data.endDate.month)?.num ?? 0
      const startDate = new Date(startYear, startMonthNum, 1)
      const endDate = new Date(endYear, endMonthNum, 1)
      invalidDate = endDate < startDate
    }

    if (invalidDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date',
        path: ['endDate'],
      })
    }
  })

export const settingsSchema = z.object({
  bulletsPerExperienceBlock: z.number().int().min(1).max(10),
  bulletsPerProjectBlock: z.number().int().min(1).max(10),
  maxCharsPerBullet: z.number().int().min(100).max(500),
  languageModel: z.nativeEnum(LanguageModel),
  sectionOrder: z
    .array(z.nativeEnum(ResumeSection))
    .length(4, 'Section order must contain exactly 4 sections')
    .refine((order) => {
      const requiredSections = Object.values(ResumeSection)
      return requiredSections.every((section) => order.includes(section))
    }, 'Section order must contain all required sections exactly once'),
})

export const analyzeJobDescriptionRequestSchema = z.object({
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
  contextualSkills: z
    .array(z.string())
    .describe(
      'Relevant skills or technologies mentioned in the job description but not explicitly stated as required, e.g., ["AWS", "Docker", "Kafka"]'
    ),
  salaryRange: z
    .string()
    .describe('Salary range as listed in the job posting')
    .optional()
    .default(''),
})

export const jobDescriptionSchema = z
  .string()
  .min(1, 'Job description is required')

export const jobDetailsSchema = z.object({
  originalJobDescription: jobDescriptionSchema,
  analysis: jobDescriptionAnalysisSchema,
})

export const resumeMintRequestSchema = z.object({
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
    startDate: educationStartDateSchema,
    endDate: educationEndDateSchema,
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
  .superRefine((data, ctx) => {
    const isDateProvided = (
      date: { month?: string; year?: string } | undefined
    ) => {
      return (
        date &&
        ((date.month && date.month !== '') || (date.year && date.year !== ''))
      )
    }

    const startDateProvided = isDateProvided(data.startDate)
    const endDateProvided = isDateProvided(data.endDate)

    if (!startDateProvided && !endDateProvided) {
      return
    }

    if (startDateProvided && !endDateProvided) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date is required when start date is provided',
        path: ['endDate'],
      })
      return
    }

    if (data.startDate && startDateProvided) {
      const startDate = data.startDate
      const startMonthSpecified = startDate.month
        ? startDate.month.length > 0
        : false

      if (startMonthSpecified && (!startDate.year || startDate.year === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Year is required when month is specified',
          path: ['startDate'],
        })
        return
      }

      if (
        startDate.year &&
        startDate.year !== '' &&
        !/^\d{4}$/.test(startDate.year)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start year must be four digits (e.g., 2020)',
          path: ['startDate'],
        })
        return
      }
    }

    if (data.endDate && endDateProvided) {
      const endDate = data.endDate
      const endMonthSpecified = endDate.month ? endDate.month.length > 0 : false

      if (endMonthSpecified && (!endDate.year || endDate.year === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Year is required when month is specified',
          path: ['endDate'],
        })
        return
      }

      if (
        endDate.year &&
        endDate.year !== '' &&
        !/^\d{4}$/.test(endDate.year)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End year must be four digits (e.g., 2020)',
          path: ['endDate'],
        })
        return
      }
    }

    // Cross-date validation only if both are present AND have actual values
    if (
      startDateProvided &&
      endDateProvided &&
      data.startDate &&
      data.endDate &&
      data.startDate.year &&
      data.startDate.year !== '' &&
      data.endDate.year &&
      data.endDate.year !== ''
    ) {
      const startDate = data.startDate
      const endDate = data.endDate

      // Priority 1: Format consistency
      const startMonthSpecified = startDate.month
        ? startDate.month.length > 0
        : false
      const endMonthSpecified = endDate.month ? endDate.month.length > 0 : false

      if (startMonthSpecified !== endMonthSpecified) {
        if (startMonthSpecified) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End month is required when start month is specified',
            path: ['endDate'],
          })
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Start month is required when end month is specified',
            path: ['startDate'],
          })
        }
        return
      }

      // Priority 2: Date validation
      const startYear = parseInt(startDate.year, 10)
      const endYear = parseInt(endDate.year, 10)

      let invalidDate = false

      if (!startMonthSpecified && !endMonthSpecified) {
        // Years only: end >= start (same allowed)
        invalidDate = endYear < startYear
      } else if (startMonthSpecified && endMonthSpecified) {
        // Months + years: end >= start (same month/year allowed)
        const startMonthNum =
          MONTHS.find((m) => m.label === startDate.month)?.num ?? 0
        const endMonthNum =
          MONTHS.find((m) => m.label === endDate.month)?.num ?? 0
        const startDateObj = new Date(startYear, startMonthNum, 1)
        const endDateObj = new Date(endYear, endMonthNum, 1)
        invalidDate = endDateObj < startDateObj
      }

      if (invalidDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be on or after start date',
          path: ['endDate'],
        })
      }
    }
  })

export const skillsValidationSchema = z.object({
  hardSkills: z.object({
    skills: z.array(z.string()).default([]),
    suggestions: z.array(z.string()).default([]),
  }),
  softSkills: z.object({
    skills: z.array(z.string()).default([]),
    suggestions: z.array(z.string()).default([]),
  }),
})

export const resumeSkillBlockSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  skills: z.array(z.string()).default([]),
  isIncluded: z.boolean().optional().default(true),
})

export const generateSkillsRequestSchema = z.object({
  jobAnalysis: jobDescriptionAnalysisSchema,
  currentSkills: skillsValidationSchema,
  userExperience: z.array(
    z.string().min(1, 'Experience description cannot be empty')
  ),
  settings: settingsSchema,
})

export const extractSkillsSchema = z.object({
  experienceSections: z.array(experienceBlockSchema),
  projectSections: z.array(projectBlockSchema),
  currentSkills: skillsValidationSchema,
  settings: settingsSchema,
})

export const generateSkillsResponseSchema = z.object({
  hardSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
})

export const createPdfRequestSchema = z.object({
  personalDetails: personalDetailsSchema,
  experienceSection: z.array(experienceBlockSchema),
  projectSection: z.array(projectBlockSchema),
  educationSection: z.array(educationBlockSchema),
  skillsSection: z.array(resumeSkillBlockSchema),
  settings: settingsSchema,
})

export const categorizeSkillsSchema = z.object({
  jobAnalysis: jobDescriptionAnalysisSchema,
  skills: skillsValidationSchema,
  settings: settingsSchema,
})

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
})

const passwordValidation = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(15, 'Password must be no more than 15 characters')
  .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number')
  .regex(
    /[!@#$%^&*]/,
    'Password must contain at least 1 special character (!@#$%^&*)'
  )
  .regex(
    /^[a-zA-Z0-9!@#$%^&*]+$/,
    'Password can only contain letters, numbers, and these symbols: !@#$%^&*'
  )

export const signupSchema = z
  .object({
    email: z.string().email('Valid email address is required'),
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
