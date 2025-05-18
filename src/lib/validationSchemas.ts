import { months } from './constants'
import { Month } from './types/projects'
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

          // Final URL object validation
          const url = new URL(urlToValidate)
          return true
        } catch {
          return false
        }
      },
      { message: errorMessage }
    ),
    z.literal(''),
  ])
}

const bulletPointSchema = z.object({
  id: z.string(),
  text: z
    .string()
    .min(1, 'Bullet point cannot be empty')
    .max(500, 'Bullet point must be 500 characters or less'),
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

export const experienceBlockSchema = z
  .object({
    id: z.string(),
    jobTitle: z
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
        months.find((m) => m.label === data.startDate.month)?.num || 0,
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        months.find((m) => m.label === data.endDate.month)?.num || 0,
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
    id: z.string(),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be 100 characters or less'),
    startDate: startDateSchema,
    endDate: endDateSchema,
    technologies: z.array(z.string()).default([]),
    link: urlValidator().default(''),
    description: z.string().default(''),
    bulletPoints: z.array(bulletPointSchema).default([]),
  })
  .refine(
    (data) => {
      // If present, no need to check date comparisons
      if (data.endDate.isPresent) {
        return true
      }

      // If both months are undefined, just compare years
      if (!data.startDate.month && !data.endDate.month) {
        const startYear = parseInt(data.startDate.year)
        const endYear = parseInt(data.endDate.year)
        return endYear >= startYear
      }

      // If one month is defined but the other isn't, invalid
      if (
        (data.startDate.month && !data.endDate.month) ||
        (!data.startDate.month && data.endDate.month)
      ) {
        return false
      }

      // Both months are defined, compare full dates
      const startDate = new Date(
        parseInt(data.startDate.year),
        months.find((m) => m.label === data.startDate.month)?.num || 0,
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        months.find((m) => m.label === data.endDate.month)?.num || 0,
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

      // Both should be defined or both should be undefined
      const startMonthDefined = data.startDate.month !== undefined
      const endMonthDefined = data.endDate.month !== undefined

      return startMonthDefined === endMonthDefined
    },
    {
      message:
        'If you specify a month for one date, you must specify it for both dates',
      path: ['endDate'],
    }
  )

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

export const JobDescriptionAnalysisSchema = z.object({
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
  jobDescriptionAnalysis: JobDescriptionAnalysisSchema,
  settings: settingsSchema,
})

export const generateBulletsRequestSchema = z.object({
  section: z.object({
    type: z.enum(['experience', 'project']),
    description: z.string().optional(),
  }),
  existingBullets: z.array(bulletPointSchema).default([]),
  jobDescriptionAnalysis: JobDescriptionAnalysisSchema,
  numBullets: z.number().int().min(1),
  maxCharsPerBullet: z.number(),
})
