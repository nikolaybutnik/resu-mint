import styles from './AutoCompleteInput.module.scss'
import { memo, useState } from 'react'

interface AutoCompleteInputProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  onChange: (value: string) => void
}

const AutoCompleteInput = ({
  suggestions,
  onSuggestionClick,
  onChange,
}: AutoCompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const handleFocus = (): void => {
    setIsOpen(true)
  }

  const handleBlur = (): void => {
    setTimeout(() => {
      setIsOpen(false)
    }, 100)
  }

  const handleSuggestionClick = (suggestion: string): void => {
    onSuggestionClick(suggestion)
    setInputValue('')
    onChange('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setInputValue(value)
    onChange(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && suggestions.length > 0) {
        handleSuggestionClick(suggestions[0])
      }
      return
    }

    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }
  }

  return (
    <div className={styles.autoCompleteInputContainer}>
      <input
        type='text'
        className={styles.input}
        data-no-dnd='true'
        value={inputValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <div
        className={`${styles.suggestionsContainer} ${
          isOpen ? styles.open : ''
        }`}
        data-no-dnd='true'
      >
        <div className={styles.suggestionsContent}>
          {suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <div
                key={suggestion}
                className={styles.suggestionChip}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))
          ) : (
            // TODO: If no suggestions are found, we should offer the user to add it anyway, and categorize it as "hard" or "soft"
            // (unless the input es empty)
            <div className={styles.noSuggestions}>No suggestions found</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(AutoCompleteInput)
