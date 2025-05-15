import { months } from './constants'
import { Month } from './types/projects'
import z from 'zod'
import { LanguageModel } from './types/settings'

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
  linkedin: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/(www\.)?linkedin\.com\/.*$/.test(val),
      'Please enter a valid LinkedIn URL'
    ),
  github: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/(www\.)?github\.com\/.*$/.test(val),
      'Please enter a valid GitHub URL'
    ),
  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/(www\.)?.*$/.test(val),
      'Please enter a valid website URL'
    ),
})

export const startDateSchema = z.object({
  month: z.union([z.enum(monthLabels), z.literal('')]),
  year: z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
})

export const endDateSchema = z.discriminatedUnion('isPresent', [
  z.object({
    isPresent: z.literal(true),
    month: z.literal(''),
    year: z.literal(''),
  }),
  z.object({
    isPresent: z.literal(false),
    month: z.union([z.enum(monthLabels), z.literal('')]),
    year: z.string().regex(/^\d{4}$/, 'Year must be four digits (e.g., 2020)'),
  }),
])

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

      if (!data.startDate.month || !data.endDate.month) {
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
    technologies: z.array(z.string()).optional(),
    link: z.union([z.string().url('Invalid URL'), z.literal('')]).optional(),
    description: z
      .string()
      .max(2000, 'Description must be 2000 characters or less')
      .optional(),
    bulletPoints: z.array(bulletPointSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.endDate.isPresent || !data.endDate.year) {
        return true
      }

      if (!data.startDate.month || !data.endDate.month) {
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
