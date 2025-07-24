import styles from './Suggestions.module.scss'
import {
  useState,
  useEffect,
  memo,
  forwardRef,
  useRef,
  useLayoutEffect,
} from 'react'
import { FaTimes } from 'react-icons/fa'
import LongPressHandler from '../../shared/LongPressHandler/LongPressHandler'
import { useMobile } from '@/lib/hooks/useMobile'
import Portal from '../../shared/Portal/Portal'

interface SuggestionsProps {
  suggestions: string[]
  show: boolean
  onSuggestionClick: (suggestion: string) => void
  onSuggestionDelete?: (suggestion: string) => void
}

const Suggestions = memo(
  forwardRef<HTMLDivElement, SuggestionsProps>(
    ({ suggestions, show, onSuggestionClick, onSuggestionDelete }, ref) => {
      const containerRef = useRef<HTMLDivElement>(null)

      const [isVisible, setIsVisible] = useState(false)
      const [showTopFade, setShowTopFade] = useState(false)
      const [showBottomFade, setShowBottomFade] = useState(false)
      const [suggestionsPosition, setSuggestionsPosition] = useState({
        top: 0,
        left: 0,
        width: 0,
      })

      const isMobile = useMobile()

      useEffect(() => {
        if (show) {
          setTimeout(() => setIsVisible(true), 10)
        } else {
          setIsVisible(false)
        }
      }, [show])

      const updateSuggestionsPosition = () => {
        const inputWrapper =
          ref && 'current' in ref ? ref.current?.parentElement : null
        if (inputWrapper) {
          const rect = inputWrapper.getBoundingClientRect()
          setSuggestionsPosition({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX,
            width: rect.width,
          })
        }
      }

      useLayoutEffect(() => {
        if (show && isVisible) {
          updateSuggestionsPosition()

          const handleScroll = () => updateSuggestionsPosition()
          const handleResize = () => updateSuggestionsPosition()

          window.addEventListener('scroll', handleScroll, true)
          window.addEventListener('resize', handleResize)

          setTimeout(() => {
            checkScrollState()
          }, 100)

          return () => {
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', handleResize)
          }
        }
      }, [show, isVisible, ref])

      const checkScrollState = () => {
        if (!containerRef.current || suggestions.length === 0) {
          setShowTopFade(false)
          setShowBottomFade(false)
          return
        }

        const container = containerRef.current
        const { scrollTop, scrollHeight, clientHeight } = container

        const threshold = 2

        setShowTopFade(scrollTop > threshold)
        setShowBottomFade(scrollTop + clientHeight + threshold < scrollHeight)
      }

      const handleScroll = () => {
        checkScrollState()
      }

      const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
      }

      if (suggestions.length === 0 || !show) return null

      return (
        <>
          {/* Hidden ref element to maintain ref compatibility */}
          <div ref={ref} style={{ display: 'none' }} />

          {isVisible && (
            <Portal>
              <div
                className={`${styles.suggestionsWrapper} ${styles.visible}`}
                style={{
                  position: 'fixed',
                  top: suggestionsPosition.top,
                  left: suggestionsPosition.left,
                  width: suggestionsPosition.width,
                  transform: 'translateY(-100%)',
                }}
                onMouseDown={handleMouseDown}
              >
                <p>
                  Recommendations{' '}
                  {isMobile && (
                    <span className={styles.hint}>• Hold to dismiss</span>
                  )}
                </p>

                <div
                  className={`${styles.fadeTop} ${
                    showTopFade ? styles.visible : ''
                  }`}
                />
                <div
                  className={`${styles.fadeBottom} ${
                    showBottomFade ? styles.visible : ''
                  }`}
                />

                <div
                  className={styles.suggestionsContainer}
                  ref={containerRef}
                  onScroll={handleScroll}
                >
                  <div className={styles.suggestionsContent}>
                    {suggestions.slice(0, 6).map((suggestion, index) => (
                      <div key={index}>
                        {isMobile ? (
                          <LongPressHandler
                            onLongPress={() => onSuggestionDelete?.(suggestion)}
                            longPressDuration={1000}
                            showAnimation={false}
                          >
                            <button
                              type='button'
                              className={styles.suggestionBubble}
                              onClick={() => onSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </button>
                          </LongPressHandler>
                        ) : (
                          <div
                            className={styles.suggestionChip}
                            title='Click to add'
                          >
                            <span
                              className={styles.suggestionText}
                              onClick={() => onSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </span>
                            <button
                              type='button'
                              className={styles.removeSuggestion}
                              onClick={() => onSuggestionDelete?.(suggestion)}
                              title='Dismiss'
                            >
                              <FaTimes size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Portal>
          )}
        </>
      )
    }
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.show === nextProps.show &&
      prevProps.suggestions.length === nextProps.suggestions.length &&
      prevProps.suggestions.every(
        (suggestion, index) => suggestion === nextProps.suggestions[index]
      )
    )
  }
)

Suggestions.displayName = 'Suggestions'

export default Suggestions
