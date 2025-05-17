import { useState, useEffect, useCallback } from 'react'
import { PointerSensor as LibPointerSensor } from '@dnd-kit/core'
import { PointerEvent } from 'react'

/**
 * Debounces a value, returning the last value after a delay
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

/**
 * Debounces a callback, returning the last value after a delay
 *
 * @param callback - The callback to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced callback
 */
export function useDebouncedCallback<
  T extends (...args: Parameters<T>) => ReturnType<T>
>(callback: T, delay: number): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>(
    undefined
  )

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      setTimeoutId(
        setTimeout(() => {
          callback(...args)
        }, delay)
      )
    },
    [callback, delay, timeoutId]
  )

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return debouncedFn
}

/**
 * Pointer sensor for dnd-kit, blocks activation if data-no-dnd="true" is set on the element
 *
 * @param element - The element to check
 * @returns True if the event should be handled, false otherwise
 */
export class PointerSensor extends LibPointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: PointerEvent) => {
        return shouldHandleEvent(event.target as HTMLElement)
      },
    },
  ]
}

/**
 * Checks if the event should be handled by dnd-kit
 *
 * @param element - The element to check
 * @returns True if the event should be handled, false otherwise
 */
const shouldHandleEvent = (element: HTMLElement | null) => {
  let cur = element

  while (cur) {
    if (cur.dataset && cur.dataset.noDnd) {
      return false
    }
    cur = cur.parentElement
  }

  return true
}

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
  maxLength: number = 1000,
  trimWhitespace: boolean = true
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
  } catch (e) {
    return ''
  }
}
