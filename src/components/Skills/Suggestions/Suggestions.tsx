import styles from './Suggestions.module.scss'
import { useState, useEffect, memo, forwardRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import LongPressHandler from '../../shared/LongPressHandler/LongPressHandler'
import { useMobile } from '@/lib/hooks/useMobile'

interface SuggestionsProps {
  suggestions: string[]
  show: boolean
  onSuggestionClick: (suggestion: string) => void
  onSuggestionDelete?: (suggestion: string) => void
}

const Suggestions = memo(
  forwardRef<HTMLDivElement, SuggestionsProps>(
    ({ suggestions, show, onSuggestionClick, onSuggestionDelete }, ref) => {
      const [isVisible, setIsVisible] = useState(false)
      const isMobile = useMobile()

      useEffect(() => {
        if (show) {
          setTimeout(() => setIsVisible(true), 10)
        } else {
          setIsVisible(false)
        }
      }, [show])

      const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
      }

      if (suggestions.length === 0) return null

      return (
        <div
          ref={ref}
          className={`${styles.suggestionsWrapper} ${
            isVisible ? styles.visible : styles.hidden
          }`}
          onMouseDown={handleMouseDown}
        >
          <p>
            Recommendations{' '}
            {isMobile && <span className={styles.hint}>• Hold to dismiss</span>}
          </p>
          <div className={styles.suggestionsContainer}>
            {suggestions.slice(0, 4).map((suggestion, index) => (
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
                  <div className={styles.suggestionChip}>
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
