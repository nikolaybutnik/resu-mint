import { STORAGE_KEYS } from './constants'

/**
 * Sanitizes user input for UI display, preventing XSS and normalizing text
 *
 * @param input - The user input string to sanitize
 * @param options - Optional configuration for sanitization
 * @returns The sanitized string for UI display
 */
export const sanitizeInput = (
  input: string,
  options: {
    trimWhitespace?: boolean
    maxLength?: number
    allowHtml?: boolean
    removeLineBreaks?: boolean
    collapseWhitespace?: boolean
    preserveEmptyLine?: boolean
  } = {}
): string => {
  if (!input) return ''

  const {
    trimWhitespace = false,
    maxLength,
    allowHtml = false,
    removeLineBreaks = false,
    collapseWhitespace = false,
    preserveEmptyLine = false,
  } = options

  let sanitized = input

  // Normalize Unicode to NFKC
  sanitized = sanitized.normalize('NFKC')

  // Trim whitespace (leading/trailing only)
  if (trimWhitespace) {
    sanitized = sanitized.trim()
  }

  // Remove HTML tags (basic regex, safe for plain text)
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Handle line breaks
  if (removeLineBreaks) {
    sanitized = sanitized.replace(/\r?\n|\r/g, ' ')
  } else if (preserveEmptyLine) {
    // Normalize to \n and allow up to two consecutive \n (one empty line)
    sanitized = sanitized.replace(/\r?\n|\r/g, '\n')
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n')
  } else {
    // Normalize to \n without preserving empty lines
    sanitized = sanitized.replace(/\r?\n|\r/g, '\n')
  }

  // Collapse multiple spaces to single space
  if (collapseWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ')
  }

  // Truncate to maxLength
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitizes resume bullet points for UI display
 * Collapses all line breaks and excessive whitespace to a single space
 *
 * @param input - The bullet point content to sanitize
 * @param maxLength - Optional maximum character length (defaults to 500)
 * @param trimWhitespace - Whether to trim leading/trailing whitespace (defaults to true)
 * @returns The sanitized bullet point content for UI
 */
export const sanitizeResumeBullet = (
  input: string,
  trimWhitespace: boolean = true,
  maxLength: number = 500
): string => {
  return sanitizeInput(input, {
    trimWhitespace,
    maxLength,
    allowHtml: false,
    removeLineBreaks: true,
    collapseWhitespace: true,
  })
}

/**
 * Sanitizes resume descriptions (e.g., project/work experience) for UI display
 * Preserves one empty line (two \n) and collapses excessive line breaks
 *
 * @param input - The description content to sanitize
 * @param maxLength - Optional maximum character length (defaults to 1000)
 * @param trimWhitespace - Whether to trim leading/trailing whitespace (defaults to true)
 * @returns The sanitized description content for UI
 */
export const sanitizeResumeContent = (
  input: string,
  trimWhitespace: boolean = true,
  maxLength: number = 1000
): string => {
  return sanitizeInput(input, {
    trimWhitespace,
    maxLength,
    allowHtml: false,
    removeLineBreaks: false,
    collapseWhitespace: false,
    preserveEmptyLine: true,
  })
}

/**
 * Sanitizes text for LaTeX output, escaping special characters
 *
 * @param input - The text to sanitize for LaTeX
 * @returns The LaTeX-safe string
 */
export const sanitizeForLaTeX = (input: string): string => {
  if (!input) return ''

  const latexEscapeMap: { [key: string]: string } = {
    '#': '\\#',
    $: '\\$',
    '%': '\\%',
    '&': '\\&',
    '{': '\\{',
    '}': '\\}',
    _: '\\_',
    '^': '\\^',
    '~': '\\~',
    '\\': '\\textbackslash{}',
  }

  return input.replace(/[#$%&{}_^~\\]/g, (match) => latexEscapeMap[match])
}

/**
 * Sanitizes URLs for links
 *
 * @param url - The URL to sanitize
 * @param allowedDomains - Optional list of allowed domains
 * @returns The sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string, allowedDomains?: string[]): string => {
  if (!url) return ''

  let sanitized = url.trim()

  // Add https:// if no protocol
  if (!/^https?:\/\//i.test(sanitized)) {
    sanitized = 'https://' + sanitized
  }

  // Validate URL
  try {
    const urlObj = new URL(sanitized)

    // Restrict to http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return ''
    }

    // Check allowed domains
    if (allowedDomains && allowedDomains.length > 0) {
      const hostname = urlObj.hostname.toLowerCase()
      const isAllowed = allowedDomains.some(
        (domain) =>
          hostname === domain.toLowerCase() ||
          hostname.endsWith('.' + domain.toLowerCase())
      )
      if (!isAllowed) {
        return ''
      }
    }

    // Cap length at 2048
    if (urlObj.toString().length > 2048) {
      return ''
    }

    return urlObj.toString()
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('Error sanitizing URL:', e.message)
    }
    return ''
  }
}

/**
 * Sanitizes text for LaTeX bullet points - combines LaTeX escaping with text normalization
 *
 * @param input - The bullet point text to sanitize
 * @returns The LaTeX-safe, normalized bullet point text
 */
export const sanitizeLatexBullet = (input: string): string => {
  if (!input) return ''

  return input
    .trim()
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\$/g, '\\$')
    .replace(/\#/g, '\\#')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Sanitizes basic text for LaTeX (for titles, names, locations)
 * Uses minimal escaping for common resume text
 *
 * @param input - The text to sanitize
 * @returns The LaTeX-safe text
 */
export const sanitizeLatexText = (input: string): string => {
  if (!input) return ''

  return input.replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Sanitizes technology lists for LaTeX with extended character escaping
 *
 * @param input - The technology string to sanitize
 * @returns The LaTeX-safe technology string
 */
export const sanitizeLatexTech = (input: string): string => {
  if (!input) return ''

  return input
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\$/g, '\\$')
    .replace(/\#/g, '\\#')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

/**
 * Cleans up AI-generated bullet text by removing common artifacts
 * Removes quotations, trailing periods, and content in parentheses
 *
 * @param input - The generated bullet text to clean
 * @returns The cleaned bullet text
 */
export const sanitizeGeneratedBulletText = (input: string): string => {
  if (!input) return ''

  let cleaned = input.trim()

  // Remove leading and trailing quotes (single or double)
  cleaned = cleaned.replace(/^["']+|["']+$/g, '')

  // Remove trailing period
  cleaned = cleaned.replace(/\.$/, '')

  // Remove content in parentheses at the end of the string
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, '')

  return cleaned.trim()
}

/**
 * Extracts username from GitHub URL
 *
 * @param githubUrl - The GitHub URL
 * @returns The extracted username or empty string
 */
export const extractGitHubUsername = (githubUrl?: string): string => {
  return githubUrl?.replace(/\/$/, '').split('/').pop() || ''
}

/**
 * Extracts username from LinkedIn URL
 *
 * @param linkedinUrl - The LinkedIn URL
 * @returns The extracted username or empty string
 */
export const extractLinkedInUsername = (linkedinUrl?: string): string => {
  return linkedinUrl?.replace(/\/$/, '').split('/').pop() || ''
}

/**
 * Extracts display domain from website URL
 *
 * @param websiteUrl - The website URL
 * @returns The extracted domain/path or empty string
 */
export const extractWebsiteDomain = (websiteUrl?: string): string => {
  return websiteUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '') || ''
}

/**
 * Validates and sanitizes URLs or email addresses
 * Unified function that can handle both URL and email validation/sanitization
 *
 * @param input - The URL or email to validate/sanitize
 * @param type - The type of validation ('url' or 'email')
 * @param options - Optional configuration for URL validation
 * @returns The sanitized URL/email or empty string if invalid
 */
export const validateAndSanitizeInput = (
  input: string,
  type: 'url' | 'email',
  options?: {
    allowedDomains?: string[]
  }
): string => {
  if (!input) return ''

  if (type === 'email') {
    return validateEmail(input) ? input.trim() : ''
  }

  if (type === 'url') {
    return sanitizeUrl(input, options?.allowedDomains)
  }

  return ''
}

/**
 * Validates email address using comprehensive rules
 * Based on the same validation logic used in our Zod schemas
 *
 * @param email - The email address to validate
 * @returns True if email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false

  const trimmedEmail = email.trim()
  if (!trimmedEmail) return false

  // Basic email regex pattern that matches most valid email formats
  // This is similar to what Zod uses internally for email validation
  const emailRegex =
    /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/

  if (!emailRegex.test(trimmedEmail)) return false

  // Additional validation rules
  const parts = trimmedEmail.split('@')
  if (parts.length !== 2) return false

  const [localPart, domain] = parts

  // Local part validation (before @)
  if (localPart.length === 0 || localPart.length > 64) return false
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false
  if (localPart.includes('..')) return false

  // Domain part validation (after @)
  if (domain.length === 0 || domain.length > 253) return false
  if (domain.startsWith('.') || domain.endsWith('.')) return false
  if (domain.includes('..')) return false

  // Domain must have at least one dot and valid TLD
  const domainParts = domain.split('.')
  if (domainParts.length < 2) return false

  // Each domain part must be valid
  for (const part of domainParts) {
    if (part.length === 0 || part.length > 63) return false
    if (part.startsWith('-') || part.endsWith('-')) return false
    if (!/^[a-zA-Z0-9-]+$/.test(part)) return false
  }

  // TLD (last part) must be at least 2 characters and only letters
  const tld = domainParts[domainParts.length - 1]
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false

  return true
}

export interface WelcomeExperienceState {
  shouldShow: boolean
  startStep: number
  completedSteps: number[]
}

/**
 * Determines if the user needs the welcome experience and which step to start at
 * Returns detailed state about welcome experience progress
 */
export const shouldShowWelcomeExperience = (): WelcomeExperienceState => {
  if (typeof window === 'undefined') {
    return { shouldShow: false, startStep: 0, completedSteps: [] }
  }

  try {
    const completedSteps: number[] = []
    let startStep = 0

    // Step 1: Check for basic personal details (name + email)
    const personalDetails = localStorage.getItem(STORAGE_KEYS.PERSONAL_DETAILS)
    let hasPersonalDetails = false
    if (personalDetails) {
      const parsed = JSON.parse(personalDetails)
      if (parsed.name?.trim() && parsed.email?.trim()) {
        hasPersonalDetails = true
        completedSteps.push(0) // Welcome screen is considered completed
        completedSteps.push(1) // Personal details are completed
      }
    }

    // Step 2: Check for work experience OR projects (at least one required)
    const experience = localStorage.getItem(STORAGE_KEYS.EXPERIENCE)
    const projects = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    let hasExperienceOrProjects = false

    if (experience) {
      const parsedExp = JSON.parse(experience)
      if (Array.isArray(parsedExp) && parsedExp.length > 0) {
        hasExperienceOrProjects = true
      }
    }

    if (!hasExperienceOrProjects && projects) {
      const parsedProjects = JSON.parse(projects)
      if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
        hasExperienceOrProjects = true
      }
    }

    if (hasExperienceOrProjects) {
      completedSteps.push(2)
    }

    // Step 3: Check for education (optional - user can skip)
    const education = localStorage.getItem(STORAGE_KEYS.EDUCATION)
    let hasEducation = false
    if (education) {
      const parsed = JSON.parse(education)
      if (Array.isArray(parsed) && parsed.length > 0) {
        hasEducation = true
        completedSteps.push(3)
      }
    }

    // Step 4: Check for job description and analysis
    const jobDetails = localStorage.getItem(STORAGE_KEYS.JOB_DETAILS)
    let hasJobDetails = false

    if (jobDetails) {
      try {
        const parsedJobDetails = JSON.parse(jobDetails)
        if (
          parsedJobDetails.originalJobDescription?.trim() &&
          parsedJobDetails.analysis
        ) {
          const { analysis } = parsedJobDetails
          if (analysis && typeof analysis === 'object' && analysis.jobSummary) {
            hasJobDetails = true
            completedSteps.push(4)
          }
        }
      } catch {
        // Invalid job details, treat as not completed
      }
    }

    // Determine if welcome experience should show and starting step
    if (!hasPersonalDetails) {
      startStep = 0
    } else if (!hasExperienceOrProjects) {
      startStep = 2
    } else if (!hasEducation) {
      startStep = 3 // Optional step
    } else if (!hasJobDetails) {
      startStep = 4
    }

    // Show welcome if any required steps are missing
    const shouldShow =
      !hasPersonalDetails || !hasExperienceOrProjects || !hasJobDetails

    return {
      shouldShow,
      startStep,
      completedSteps,
    }
  } catch (error) {
    console.error('Error checking welcome experience state:', error)
    // On error, default to showing welcome from the beginning
    return { shouldShow: true, startStep: 0, completedSteps: [] }
  }
}
