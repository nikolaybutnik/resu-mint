import styles from './DraggableProjectBlock.module.scss'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaPen,
  FaChevronDown,
  FaChevronUp,
  FaMagic,
  FaPlus,
} from 'react-icons/fa'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ROUTES } from '@/lib/constants'
import { JobDescriptionAnalysis } from '@/lib/types/api'
import { ProjectBlockData } from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeResumeBullet, useDebouncedCallback } from '@/lib/utils'
import BulletPoint from '@/components/shared/BulletPoint/BulletPoint'
import { isEqual } from 'lodash'

interface DraggableProjectBlockProps {
  data: ProjectBlockData
  jobDescriptionAnalysis: JobDescriptionAnalysis
  onBlockSelect: (id: string) => void
  onEditBullets: (updatedBlock: ProjectBlockData) => void
  settings: AppSettings
  isOverlay?: boolean
  isDropping?: boolean
}

type ErrorKey = 'bulletEmpty' | 'bulletTooLong'

type ValidationErrors = {
  [K in ErrorKey]?: string[]
}

const DraggableProjectBlock: React.FC<DraggableProjectBlockProps> = ({
  data,
  jobDescriptionAnalysis,
  onBlockSelect,
  settings,
  isOverlay = false,
  isDropping = false,
  onEditBullets,
}) => {
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isExpanded, setIsExpanded] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(
    null
  )
  const [editingBulletText, setEditingBulletText] = useState('')
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(
    null
  )
  const [localData, setLocalData] = useState<ProjectBlockData>(data)
  const [errors, setErrors] = useState<ValidationErrors>({})

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: data.id,
      disabled: isOverlay,
    })

  useEffect(() => {
    setLocalData(data)
  }, [data])

  useEffect(() => {
    if (editingBulletIndex !== null && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingBulletIndex])

  const style = isOverlay
    ? { zIndex: 100 }
    : {
        transform: CSS.Translate.toString(transform),
        transition: isDropping || isDragging ? 'none' : 'transform 0.2s ease',
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0 : 1,
      }

  const handleToggle = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    let capturedIsExpanded = isExpanded
    setIsExpanded(!capturedIsExpanded)
    setTimeout(() => {
      if (capturedIsExpanded) {
        setErrors({})
      }
      if (editingBulletIndex !== null) {
        setEditingBulletIndex(null)
        setEditingBulletText('')
      }
      if (
        localData.bulletPoints.length !== data.bulletPoints.length &&
        capturedIsExpanded
      ) {
        setLocalData(data)
      }
      setIsTransitioning(false)
    }, 400)
  }

  const validateBulletText = useDebouncedCallback((text: string) => {
    const newErrors: ValidationErrors = {}

    if (text.trim() === '') {
      newErrors.bulletEmpty = ['Bullet text cannot be empty']
    }

    if (text.length > settings.maxCharsPerBullet) {
      newErrors.bulletTooLong = [
        `Your char limit is set to ${settings.maxCharsPerBullet}. For best results, keep each bullet consistent in length.`,
      ]
    }

    setErrors((prev) => (isEqual(prev, newErrors) ? prev : newErrors))
  }, 300)

  const handleGenerateAllBullets = (e: React.MouseEvent) => {
    // TODO: implement
    e.stopPropagation()
    onEditBullets(data)
  }

  const handleRegenerateBullet = useCallback(
    async (index: number, e: React.MouseEvent, isEditing = false) => {
      e.stopPropagation()

      try {
        setRegeneratingIndex(index)

        const bulletToRegenerate = localData.bulletPoints[index]
        const existingBullets = localData.bulletPoints.filter(
          (bullet) => bullet.id !== bulletToRegenerate.id
        )

        const payload = {
          section: {
            type: 'project',
            description: data.description,
          },
          existingBullets,
          jobDescriptionAnalysis,
          numBullets: 1,
          maxCharsPerBullet: settings.maxCharsPerBullet,
        }

        const response = await fetch(ROUTES.GENERATE_BULLETS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API error:', errorData)
        }

        const result = await response.json()
        if (result.status !== 'success' || !result.data || result.errors) {
          console.error('Failed to generate bullets', result.errors)
        }

        const newBullet = {
          id: bulletToRegenerate.id,
          text: sanitizeResumeBullet(result.data[0], true),
        }

        if (isEditing) {
          setEditingBulletText(newBullet.text)
        } else {
          const updatedBullets = localData.bulletPoints.map((bullet) =>
            bullet.id === bulletToRegenerate.id ? newBullet : bullet
          )

          const updatedData = {
            ...localData,
            bulletPoints: updatedBullets,
          }

          onEditBullets(updatedData)
        }

        validateBulletText(newBullet.text)
      } catch (error) {
        console.error('Error regenerating bullet', error)
      } finally {
        setRegeneratingIndex(null)
      }
    },
    [
      localData,
      data,
      jobDescriptionAnalysis,
      settings,
      onEditBullets,
      validateBulletText,
    ]
  )

  const bulletPoints = useMemo(
    () => localData.bulletPoints,
    [localData.bulletPoints]
  )

  const handleEditBullet = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation()
      setEditingBulletIndex(index)
      setEditingBulletText(bulletPoints[index].text)
    },
    [bulletPoints]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingBulletIndex(null)
    setEditingBulletText('')
    setErrors({})
    if (localData.bulletPoints.length !== data.bulletPoints.length) {
      setLocalData(data)
    }
  }, [data, localData])

  const handleSaveBullet = useCallback(() => {
    const sanitized = sanitizeResumeBullet(editingBulletText, true)
    if (editingBulletIndex !== null && sanitized.trim() !== '') {
      const updatedData = {
        ...localData,
        bulletPoints: localData.bulletPoints.map((bullet, idx) =>
          idx === editingBulletIndex ? { ...bullet, text: sanitized } : bullet
        ),
      }
      onEditBullets(updatedData)
      setEditingBulletIndex(null)
    } else {
      const errors: ValidationErrors = {
        bulletEmpty: ['Bullet text cannot be empty'],
      }
      setErrors((prev) => ({ ...prev, ...errors }))
    }
  }, [localData, editingBulletIndex, editingBulletText, onEditBullets])

  const handleDeleteBullet = useCallback(
    (index: number) => {
      const updatedData = {
        ...localData,
        bulletPoints: localData.bulletPoints.filter(
          (_bullet, bulletIndex) => bulletIndex !== index
        ),
      }
      onEditBullets(updatedData)
    },
    [localData, onEditBullets]
  )

  const handleAddBullet = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newBullet = {
      id: uuidv4(),
      text: '',
    }

    let scopedData = localData
    setLocalData((prev) => {
      const newBullets = [...prev.bulletPoints, newBullet]
      scopedData = {
        ...prev,
        bulletPoints: newBullets,
      }

      if (!isExpanded) {
        handleToggle()
      }

      setEditingBulletIndex(scopedData.bulletPoints.length - 1)
      setEditingBulletText('')

      return scopedData
    })
  }

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const sanitized = sanitizeResumeBullet(e.target.value, false)
      setEditingBulletText(sanitized)
      validateBulletText(sanitized)
    },
    [validateBulletText]
  )

  const emptyErrors = useMemo(() => ({}), [])
  const bulletErrors = useMemo(
    () =>
      localData.bulletPoints.map((_, index) =>
        editingBulletIndex === index ? errors : emptyErrors
      ),
    [errors, editingBulletIndex, localData.bulletPoints, emptyErrors]
  )

  return (
    <div
      ref={isOverlay ? null : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={[
        styles.draggableProjectBlockContainer,
        'prevent-select',
        isDragging || isOverlay ? styles.isDragging : '',
      ].join(' ')}
    >
      <div className={styles.draggableProjectBlock}>
        <div className={styles.projectBlockContent}>
          <h3 className={styles.projectBlockHeader}>{data.title}</h3>
          <p className={styles.projectBlockDate}>
            {`${data.startDate.month} ${data.startDate.year} - ${
              data.endDate.isPresent
                ? 'Present'
                : `${data.endDate.month} ${data.endDate.year}`
            }`}
          </p>
        </div>

        <div className={styles.projectBlockActions}>
          <button
            type='button'
            data-no-dnd='true'
            className={styles.generateAllButton}
            onClick={handleGenerateAllBullets}
            disabled={
              isDragging ||
              isOverlay ||
              editingBulletIndex !== null ||
              regeneratingIndex !== null
            }
          >
            <FaMagic size={12} />
            <span>Generate</span>
          </button>
          <button
            type='button'
            data-no-dnd='true'
            className={styles.editButton}
            onClick={() => onBlockSelect(data.id)}
            disabled={
              isDragging ||
              isOverlay ||
              editingBulletIndex !== null ||
              regeneratingIndex !== null
            }
          >
            <FaPen />
          </button>
        </div>
      </div>

      {localData.bulletPoints.length > 0 && (
        <button
          className={`${styles.drawerToggleButton} ${
            isExpanded ? styles.noRadius : ''
          }`}
          onClick={handleToggle}
        >
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      )}

      <div
        data-no-dnd='true'
        className={`${styles.projectBlockDrawer} ${
          isExpanded ? styles.expanded : ''
        }`}
      >
        {bulletPoints.map((bullet, index) => (
          <BulletPoint
            key={bullet.id}
            index={index}
            text={bullet.text}
            editingText={editingBulletIndex === index ? editingBulletText : ''}
            isRegenerating={regeneratingIndex === index}
            isEditing={editingBulletIndex === index}
            disableAllControls={
              regeneratingIndex !== null ||
              (editingBulletIndex !== null && editingBulletIndex !== index)
            }
            errors={bulletErrors[index]}
            settings={settings}
            onCancelEdit={handleCancelEdit}
            onBulletDelete={handleDeleteBullet}
            onBulletSave={handleSaveBullet}
            onEditBullet={handleEditBullet}
            onRegenerateBullet={handleRegenerateBullet}
            onTextareaChange={handleTextareaChange}
          />
        ))}

        <button
          className={styles.addBulletButton}
          onClick={handleAddBullet}
          disabled={editingBulletIndex !== null}
          data-no-dnd='true'
        >
          <FaPlus size={12} />
        </button>
      </div>

      {localData.bulletPoints.length === 0 && !isExpanded && (
        <button
          className={styles.addBulletButton}
          onClick={handleAddBullet}
          disabled={editingBulletIndex !== null}
          data-no-dnd='true'
        >
          <FaPlus size={12} />
        </button>
      )}
    </div>
  )
}

export default DraggableProjectBlock
