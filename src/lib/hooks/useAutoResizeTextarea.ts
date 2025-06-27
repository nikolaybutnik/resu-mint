import React, { useCallback, useEffect, useRef } from 'react'
import { useMobile } from './useMobile'

interface UseAutoResizeTextareaOptions {
  minHeight?: number
  extraPadding?: number
  dependencies?: React.DependencyList
}

export const useAutoResizeTextarea = (
  value: string,
  options: UseAutoResizeTextareaOptions = {}
) => {
  const { minHeight = 80, extraPadding = 4, dependencies = [] } = options

  const isMobile = useMobile()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    if (isMobile && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'

      // Account for padding, border, and a little extra space
      const newHeight = Math.max(
        minHeight,
        textarea.scrollHeight + extraPadding
      )
      textarea.style.height = newHeight + 'px'
    }
  }, [isMobile, minHeight, extraPadding])

  // Auto-resize when value changes on mobile
  useEffect(() => {
    if (isMobile) {
      autoResize()
    }
  }, [value, isMobile, autoResize, ...dependencies])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Auto-resize on mobile when typing
      if (isMobile) {
        setTimeout(autoResize, 0)
      }
      return e.target.value
    },
    [isMobile, autoResize]
  )

  const handleInput = useCallback(() => {
    autoResize()
  }, [autoResize])

  return {
    textareaRef,
    handleChange,
    handleInput,
    autoResize,
  }
}
