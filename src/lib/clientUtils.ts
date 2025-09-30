import { useState, useEffect, useCallback } from 'react'
import {
  PointerSensor as LibPointerSensor,
  MouseSensor as LibMouseSensor,
  TouchSensor as LibTouchSensor,
} from '@dnd-kit/core'
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
 * Mouse sensor for dnd-kit, blocks activation if data-no-dnd="true" is set on the element
 */
export class MouseSensor extends LibMouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler: ({ nativeEvent: event }: React.MouseEvent) => {
        return shouldHandleEvent(event.target as HTMLElement)
      },
    },
  ]
}

/**
 * Touch sensor for dnd-kit, blocks activation if data-no-dnd="true" is set on the element
 */
export class TouchSensor extends LibTouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: React.TouchEvent) => {
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
