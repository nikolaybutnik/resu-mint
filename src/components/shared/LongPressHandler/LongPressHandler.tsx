import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './LongPressHandler.module.scss'

interface TouchFeedback {
  x: number
  y: number
  show: boolean
}

interface LongPressHandlerProps {
  children: React.ReactNode
  disabled?: boolean
  className?: string
  title?: string
  onTouchStart?: (e: React.TouchEvent) => void
  onTouchEnd?: (e: React.TouchEvent) => void
  onTouchMove?: (e: React.TouchEvent) => void
  onClick?: (e: React.MouseEvent) => void
}

const LongPressHandler: React.FC<LongPressHandlerProps> = ({
  children,
  disabled = false,
  className = '',
  title,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  onClick,
}) => {
  const touchCleanupRef = useRef<(() => void) | null>(null)
  const initialScrollRef = useRef<{ x: number; y: number } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [touchFeedback, setTouchFeedback] = useState<TouchFeedback | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0
      )
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isMobile && !disabled) {
        const touch = e.touches[0]
        const rect = e.currentTarget.getBoundingClientRect()

        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top

        // Store initial scroll position
        initialScrollRef.current = {
          x: window.scrollX,
          y: window.scrollY,
        }

        setIsLongPressing(true)

        // Wait 150ms before showing animation to differentiate from swipe
        const showAnimationTimer = setTimeout(() => {
          setTouchFeedback({ x, y, show: true })
        }, 150)

        const resetTimer = setTimeout(() => {
          setIsLongPressing(false)
          setTouchFeedback(null)
          initialScrollRef.current = null
        }, 850) // 750ms + 100ms buffer

        const cleanup = () => {
          clearTimeout(showAnimationTimer)
          clearTimeout(resetTimer)
          initialScrollRef.current = null
        }

        // Store cleanup function in ref
        touchCleanupRef.current = cleanup
      }

      // Call parent handler if provided
      onTouchStart?.(e)
    },
    [isMobile, disabled, onTouchStart]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      setIsLongPressing(false)
      setTouchFeedback(null)
      initialScrollRef.current = null

      if (touchCleanupRef.current) {
        touchCleanupRef.current()
        touchCleanupRef.current = null
      }

      // Call parent handler if provided
      onTouchEnd?.(e)
    },
    [onTouchEnd]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (initialScrollRef.current) {
        const currentScrollX = window.scrollX
        const currentScrollY = window.scrollY
        const scrollDistance = Math.sqrt(
          Math.pow(currentScrollX - initialScrollRef.current.x, 2) +
            Math.pow(currentScrollY - initialScrollRef.current.y, 2)
        )

        // Cancel if page has scrolled more than 5px
        if (scrollDistance > 5) {
          setIsLongPressing(false)
          setTouchFeedback(null)

          if (touchCleanupRef.current) {
            touchCleanupRef.current()
            touchCleanupRef.current = null
          }
          return
        }
      }

      // If user moves finger too much, cancel the long press
      if (touchFeedback) {
        const touch = e.touches[0]
        const rect = e.currentTarget.getBoundingClientRect()
        const currentX = touch.clientX - rect.left
        const currentY = touch.clientY - rect.top

        const distance = Math.sqrt(
          Math.pow(currentX - touchFeedback.x, 2) +
            Math.pow(currentY - touchFeedback.y, 2)
        )

        // Cancel if moved more than 15px
        if (distance > 15) {
          setIsLongPressing(false)
          setTouchFeedback(null)

          if (touchCleanupRef.current) {
            touchCleanupRef.current()
            touchCleanupRef.current = null
          }
        }
      }

      // Call parent handler if provided
      onTouchMove?.(e)
    },
    [touchFeedback, onTouchMove]
  )

  // Clear long press state when disabled changes
  useEffect(() => {
    if (disabled) {
      setIsLongPressing(false)
      setTouchFeedback(null)
      if (touchCleanupRef.current) {
        touchCleanupRef.current()
        touchCleanupRef.current = null
      }
    }
  }, [disabled])

  return (
    <div
      className={[className, isLongPressing ? styles.longPressing : ''].join(
        ' '
      )}
      title={title}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={onClick}
    >
      {children}

      {touchFeedback && touchFeedback.show && (
        <div
          className={styles.touchFeedback}
          style={{
            left: touchFeedback.x,
            top: touchFeedback.y,
          }}
        >
          <svg className={styles.progressRing}>
            <circle
              className={styles.progressBackground}
              cx='40'
              cy='40'
              r='35'
            />
            <circle
              className={styles.progressForeground}
              cx='40'
              cy='40'
              r='35'
            />
            <circle className={styles.progressCenter} cx='40' cy='40' r='12' />
          </svg>
        </div>
      )}
    </div>
  )
}

export default LongPressHandler
