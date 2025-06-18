'use client'

import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { PointerSensor as LibPointerSensor } from '@dnd-kit/core'
import { PointerEvent } from 'react'

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
 * Highlights keywords in text by wrapping them in span elements
 * Case-insensitive matching with word boundaries: "TypeScript" will match "typescript", "TyPeSCRipt", etc.
 * but will not match partial words (e.g., "ai" won't match within "gains")
 *
 * @param text - The text to highlight keywords in
 * @param keywords - Array of keywords to highlight
 * @param className - CSS class name to apply to highlighted keywords
 * @returns Array of text segments and JSX span elements
 */
export const highlightKeywords = (
  text: string,
  keywords: string[],
  className: string = 'keyword-highlight'
): (string | React.ReactElement)[] => {
  if (!text || !keywords.length) return [text]

  const segments: (string | React.ReactElement)[] = []
  let remainingText = text
  let segmentIndex = 0

  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)

  while (remainingText.length > 0) {
    let foundMatch = false
    let earliestMatch: {
      keyword: string
      index: number
      matchLength: number
    } | null = null

    // Find the earliest match among all keywords using word boundaries
    for (const keyword of sortedKeywords) {
      // Escape special regex characters in the keyword
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Create regex with word boundaries and case-insensitive flag
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i')
      const match = remainingText.match(regex)

      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            keyword,
            index: match.index,
            matchLength: match[0].length,
          }
        }
      }
    }

    if (earliestMatch) {
      const { index, matchLength } = earliestMatch

      // Add text before the match
      if (index > 0) {
        segments.push(remainingText.substring(0, index))
      }

      // Add the highlighted keyword as JSX (preserve original case)
      const matchedText = remainingText.substring(index, index + matchLength)
      segments.push(
        React.createElement(
          'span',
          { key: `highlight-${segmentIndex++}`, className },
          matchedText
        )
      )

      // Update remaining text
      remainingText = remainingText.substring(index + matchLength)
      foundMatch = true
    }

    if (!foundMatch) {
      // No more matches, add remaining text
      segments.push(remainingText)
      break
    }
  }

  return segments
}
