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
