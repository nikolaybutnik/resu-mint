import styles from './AutoCompleteInput.module.scss'
import { memo, useState, useRef, useLayoutEffect } from 'react'
import { FaPlus } from 'react-icons/fa'

interface AutoCompleteInputProps {
  suggestions: string[]
  existingSkills: string[]
  onSuggestionClick: (suggestion: string) => void
  onChange: (value: string) => void
}

const AutoCompleteInput = ({
  suggestions,
  existingSkills,
  onSuggestionClick,
  onChange,
}: AutoCompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  })

  const inputRef = useRef<HTMLInputElement>(null)

  const normalizeSkill = (skill: string): string => {
    return skill.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  const isDuplicate = (input: string): boolean => {
    if (!input.trim()) return false
    const normalizedInput = normalizeSkill(input)
    return existingSkills.some(
      (skill) => normalizeSkill(skill) === normalizedInput
    )
  }

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  useLayoutEffect(() => {
    if (isOpen) {
      updateDropdownPosition()
    }
  }, [isOpen])

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

  const handleAddClick = (): void => {
    if (inputValue.trim() && !isDuplicate(inputValue)) {
      onSuggestionClick(inputValue.trim())
      setInputValue('')
      onChange('')
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim() && !isDuplicate(inputValue)) {
        handleAddClick()
      } else if (isOpen && suggestions.length > 0) {
        handleSuggestionClick(suggestions[0])
      }
      return
    }

    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }
  }

  const isAddDisabled = !inputValue.trim()
  const isInputDuplicate = isDuplicate(inputValue)

  return (
    <>
      <div className={styles.autoCompleteInputContainer}>
        <input
          ref={inputRef}
          type='text'
          className={styles.input}
          data-no-dnd='true'
          value={inputValue}
          placeholder='Start typing...'
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          type='button'
          className={styles.addButton}
          onClick={handleAddClick}
          disabled={isAddDisabled || isInputDuplicate}
          data-no-dnd='true'
        >
          <FaPlus size={12} />
        </button>
      </div>

      {isOpen && (
        <div
          className={styles.suggestionsContainer}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
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
              <div className={styles.noSuggestions}>
                {isInputDuplicate
                  ? 'This item has already been added'
                  : 'No suggestions found'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default memo(AutoCompleteInput)
