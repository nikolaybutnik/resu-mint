import { Month } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { months } from './constants'
import z from 'zod'

const monthToNumber: Record<Month, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

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
  month: z.union([z.enum(months as [Month, ...Month[]]), z.literal('')]),
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
    month: z.union([z.enum(months as [Month, ...Month[]]), z.literal('')]),
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
    bulletPoints: z
      .array(
        z
          .string()
          .min(1, 'Bullet point cannot be empty')
          .max(200, 'Bullet point must be 200 characters or less')
      )
      .optional()
      .default([]),
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
        monthToNumber[data.startDate.month],
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        monthToNumber[data.endDate.month],
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
    bulletPoints: z
      .array(
        z
          .string()
          .min(1, 'Bullet point cannot be empty')
          .max(500, 'Bullet point must be 500 characters or less')
      )
      .optional()
      .default([]),
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
        monthToNumber[data.startDate.month],
        1
      )
      const endDate = new Date(
        parseInt(data.endDate.year),
        monthToNumber[data.endDate.month],
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
})

export const resumeMintRequestSchema = z.object({
  sessionId: z.string(),
  personalDetails: personalDetailsSchema,
  workExperience: z.array(experienceBlockSchema),
  projects: z.array(projectBlockSchema),
  jobDescription: z.string(),
  settings: settingsSchema,
})
