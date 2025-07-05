import styles from './WorkExperience.module.scss'
import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { BulletPoint, ExperienceBlockData, Month } from '@/lib/types/experience'
import EditableExperienceBlock from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import DraggableExperienceBlock from '@/components/Experience/DraggableExperienceBlock/DraggableExperienceBlock'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { GenerateBulletsRequest, JobDescriptionAnalysis } from '@/lib/types/api'
import { BulletPointErrors } from '@/lib/types/errors'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensors,
  KeyboardSensor,
  useSensor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { sanitizeResumeBullet } from '@/lib/utils'
import { MouseSensor, TouchSensor } from '@/lib/clientUtils'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import { FaPlus } from 'react-icons/fa'
import { bulletService } from '@/lib/services/bulletService'
import isEqual from 'lodash/isEqual'
import { DROPPING_ANIMATION_DURATION, VALIDATION_DELAY } from '@/lib/constants'
import { KeywordData } from '@/lib/types/keywords'
import { useSettingsStore } from '@/stores'

interface WorkExperienceProps {
  data: ExperienceBlockData[]
  keywordData: KeywordData
  jobDescriptionAnalysis: JobDescriptionAnalysis
  loading: boolean
  onSave: (data: ExperienceBlockData[]) => void
}

const WorkExperience: React.FC<WorkExperienceProps> = ({
  data,
  keywordData,
  jobDescriptionAnalysis,
  loading,
  onSave,
}) => {
  const { data: settings } = useSettingsStore()

  const [localData, setLocalData] = useState<ExperienceBlockData[]>(data)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [newBlockId, setNewBlockId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)
  const [regeneratingBullet, setRegeneratingBullet] = useState<{
    section: string
    index: number
  } | null>(null)
  const [editingBullet, setEditingBullet] = useState<{
    section: string
    index: number
    text: string
    errors?: BulletPointErrors
  } | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 750,
        tolerance: 15,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (activeId) {
      document.body.classList.add('dragging-active')
    } else {
      document.body.classList.remove('dragging-active')
    }

    return () => {
      document.body.classList.remove('dragging-active')
    }
  }, [activeId])

  useEffect(() => {
    setLocalData(data)
  }, [data])

  useEffect(() => {
    if (localData.length === 0 && !selectedBlockId && !newBlockId && !loading) {
      handleSectionAdd()
    }
  }, [localData.length, selectedBlockId, newBlockId, loading])

  const findExperience = useCallback(
    (id: string) => localData.find((experience) => experience.id === id),
    [localData]
  )

  const updateExperience = useCallback(
    (updatedExperience: ExperienceBlockData) => {
      setLocalData((prev) =>
        prev.map((experience) =>
          experience.id === updatedExperience.id
            ? updatedExperience
            : experience
        )
      )
    },
    []
  )

  const handleSectionDelete = useCallback(
    (id: string) => {
      const updatedData = localData.filter((experience) => experience.id !== id)
      setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleSectionAdd = () => {
    const newBlock: ExperienceBlockData = {
      id: uuidv4(),
      title: '',
      description: '',
      startDate: { month: '' as Month, year: '' },
      endDate: { month: '' as Month, year: '', isPresent: false },
      companyName: '',
      location: '',
      bulletPoints: [],
      isIncluded: true,
    }
    const updatedData = [...localData, newBlock]
    setLocalData(updatedData)
    setSelectedBlockId(newBlock.id)
    setNewBlockId(newBlock.id)
  }

  const handleSectionSelect = useCallback((id: string) => {
    setSelectedBlockId(id)
  }, [])

  const handleSectionClose = useCallback(() => {
    setSelectedBlockId(null)
    setNewBlockId(null)
    setEditingBullet(null)
    setLocalData(data)
  }, [data])

  const handleSectionInclusion = useCallback(
    (sectionId: string, isIncluded: boolean) => {
      const updatedData = localData.map((experience) =>
        experience.id === sectionId ? { ...experience, isIncluded } : experience
      )
      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleExperienceSave = useCallback(
    (updatedBlock: ExperienceBlockData) => {
      const updatedData = localData.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      )
      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleLockToggle = useCallback(
    (sectionId: string, index: number, shouldSave: boolean) => {
      const updatedData = localData.map((block) =>
        block.id === sectionId
          ? {
              ...block,
              bulletPoints: block.bulletPoints.map((bullet, idx) =>
                idx === index
                  ? { ...bullet, isLocked: !bullet.isLocked }
                  : bullet
              ),
            }
          : block
      )
      setLocalData(updatedData)

      if (shouldSave) {
        onSave(updatedData)
      }
    },
    [localData, onSave]
  )

  const handleLockToggleAll = useCallback(
    (sectionId: string, shouldLock: boolean) => {
      const updatedData = localData.map((block) =>
        block.id === sectionId
          ? {
              ...block,
              bulletPoints: block.bulletPoints.map((bullet) => ({
                ...bullet,
                isLocked: shouldLock,
              })),
            }
          : block
      )

      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  /**
   * Regenerates a single bullet point for a experience section.
   * @param sectionId - The ID of the experience section to regenerate.
   * @param index - The index of the bullet point to regenerate.
   * @param formData - The form data of the experience block if it is being edited.
   * @param shouldSave - Whether to save the regenerated bullet to storage.
   */
  const handleBulletRegenerate = useCallback(
    async (
      sectionId: string,
      index: number,
      formData?: ExperienceBlockData,
      shouldSave?: boolean
    ) => {
      const data = formData || findExperience(sectionId)
      if (!data) return

      try {
        setRegeneratingBullet({ section: sectionId, index })

        let regeneratingBulletId: string | null = null
        let existingBullets: BulletPoint[] = []
        let payloadSection: GenerateBulletsRequest['sections'] = []

        if (formData) {
          regeneratingBulletId = formData.bulletPoints[index].id
          existingBullets = formData.bulletPoints.filter(
            (bullet) => bullet.id !== regeneratingBulletId
          )
          payloadSection = [
            {
              id: sectionId,
              type: 'experience',
              title: formData.title,
              description: formData.description || '',
              existingBullets: formData.bulletPoints
                .filter((bullet) => bullet.id !== regeneratingBulletId)
                .map((bp) => ({ ...bp, isLocked: bp.isLocked ?? false })),
              targetBulletIds: [regeneratingBulletId],
            },
          ]
        } else {
          regeneratingBulletId = data.bulletPoints[index].id
          existingBullets = data.bulletPoints.filter(
            (bullet) => bullet.id !== regeneratingBulletId
          )
          payloadSection = [
            {
              id: sectionId,
              type: 'experience',
              title: data.title,
              description: data.description || '',
              existingBullets: existingBullets.map((bp) => ({
                ...bp,
                isLocked: bp.isLocked ?? false,
              })),
              targetBulletIds: [regeneratingBulletId],
            },
          ]
        }

        const payload: GenerateBulletsRequest = {
          sections: payloadSection,
          jobDescriptionAnalysis,
          settings,
          numBullets: 1,
        }

        const generatedData = await bulletService.generateBullets(payload)

        if (generatedData.length > 0) {
          const [generatedSection] = generatedData
          const [generatedBullet] = generatedSection.bullets

          // If bullet in edit mode, update textarea only
          if (
            editingBullet &&
            editingBullet.section === sectionId &&
            editingBullet.index === index
          ) {
            setEditingBullet((prev) => {
              if (!prev) return null
              return { ...prev, text: generatedBullet.text }
            })
          } else {
            // Else, update bullet in local state
            const sourceData = formData || data
            const updatedBullets = sourceData.bulletPoints.map((bullet) =>
              bullet.id === regeneratingBulletId
                ? { ...bullet, text: generatedBullet.text }
                : bullet
            )
            const updatedExperience = {
              ...sourceData,
              bulletPoints: updatedBullets,
            }

            updateExperience(updatedExperience)
            // Use explicit shouldSave parameter, or default to !formData for backwards compatibility
            const shouldSaveToStorage =
              shouldSave !== undefined ? shouldSave : !formData
            if (shouldSaveToStorage) {
              onSave(
                localData.map((experience) =>
                  experience.id === sectionId ? updatedExperience : experience
                )
              )
            }
          }

          validateBulletText(generatedBullet.text)
        }
      } catch (error) {
        console.error('Error regenerating bullet', error)
      } finally {
        setRegeneratingBullet(null)
      }
    },
    [
      findExperience,
      jobDescriptionAnalysis,
      localData,
      onSave,
      settings.maxCharsPerBullet,
      updateExperience,
      editingBullet,
    ]
  )

  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  const expandSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      newSet.add(sectionId)
      return newSet
    })
  }, [])

  const handleAddBullet = useCallback(
    (sectionId: string, shouldSave = false) => {
      const experience = findExperience(sectionId)
      if (!experience) return

      const newBullet = {
        id: uuidv4(),
        text: '',
        isLocked: false,
      }

      const updatedExperience = {
        ...experience,
        bulletPoints: [...experience.bulletPoints, newBullet],
      }

      updateExperience(updatedExperience)

      expandSection(sectionId)

      setEditingBullet({
        section: sectionId,
        index: updatedExperience.bulletPoints.length - 1,
        text: '',
      })

      if (shouldSave) {
        onSave(
          localData.map((experience) =>
            experience.id === sectionId ? updatedExperience : experience
          )
        )
      }
    },
    [findExperience, updateExperience, expandSection, localData, onSave]
  )

  const handleBulletEdit = useCallback(
    (sectionId: string, index: number) => {
      const experience = findExperience(sectionId)
      if (!experience) return

      setEditingBullet({
        section: sectionId,
        index,
        text: experience.bulletPoints[index].text,
      })
    },
    [findExperience]
  )

  const handleBulletSave = useCallback(
    (shouldSave = true) => {
      if (!editingBullet) return

      const { section: sectionId, index, text } = editingBullet
      const experience = findExperience(sectionId)
      if (!experience) return

      const sanitized = sanitizeResumeBullet(text, true)
      if (sanitized.trim() === '') return

      // Check if this is a new bullet beyond existing bullets
      const isNewBullet = index >= experience.bulletPoints.length

      let updatedExperience: ExperienceBlockData

      if (isNewBullet) {
        // Add new bullet to the array
        const newBullet = {
          id: uuidv4(),
          text: sanitized,
          isLocked: false,
        }
        updatedExperience = {
          ...experience,
          bulletPoints: [...experience.bulletPoints, newBullet],
        }
      } else {
        // Update existing bullet
        updatedExperience = {
          ...experience,
          bulletPoints: experience.bulletPoints.map((bullet, idx) =>
            idx === index ? { ...bullet, text: sanitized } : bullet
          ),
        }
      }

      updateExperience(updatedExperience)

      if (shouldSave) {
        onSave(
          localData.map((experience) =>
            experience.id === sectionId ? updatedExperience : experience
          )
        )
      }

      setEditingBullet(null)
    },
    [editingBullet, findExperience, localData, onSave, updateExperience]
  )

  const handleCancelEdit = useCallback(() => {
    if (!editingBullet) return

    const { section: sectionId, index } = editingBullet
    const experience = findExperience(sectionId)
    if (!experience) return

    // Check if this is a new bullet that doesn't exist in main state
    const isNewBullet =
      index >= experience.bulletPoints.length ||
      (index === experience.bulletPoints.length - 1 &&
        experience.bulletPoints[index].text === '')

    if (isNewBullet) {
      const updatedExperience = {
        ...experience,
        bulletPoints: experience.bulletPoints.slice(0, -1),
      }
      updateExperience(updatedExperience)
    }

    setEditingBullet(null)
  }, [editingBullet, findExperience, updateExperience])

  const handleBulletDelete = useCallback(
    (sectionId: string, index: number, shouldSave: boolean) => {
      const experience = findExperience(sectionId)
      if (!experience) return

      const updatedExperience = {
        ...experience,
        bulletPoints: experience.bulletPoints.filter((_, idx) => idx !== index),
      }

      updateExperience(updatedExperience)

      if (shouldSave) {
        onSave(
          localData.map((experience) =>
            experience.id === sectionId ? updatedExperience : experience
          )
        )
      }
    },
    [findExperience, localData, onSave, updateExperience]
  )

  const validateBulletText = useCallback(
    (text: string) => {
      if (!editingBullet) return

      const errors: {
        bulletEmpty?: string[]
        bulletTooLong?: string[]
      } = {}

      if (text.trim() === '') {
        errors.bulletEmpty = ['Bullet text cannot be empty']
      }

      if (text.length > settings.maxCharsPerBullet) {
        errors.bulletTooLong = [
          `Your character target is ${settings.maxCharsPerBullet}. For best results, keep each bullet consistent in length.`,
        ]
      }

      setEditingBullet((prev) => {
        if (!prev) return null
        if (isEqual(prev.errors, errors)) return prev
        return { ...prev, errors }
      })
    },
    [editingBullet, settings.maxCharsPerBullet]
  )

  const handleBulletTextUpdate = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!editingBullet) return

      const sanitized = sanitizeResumeBullet(e.target.value, false)
      setEditingBullet((prev) => {
        if (!prev) return null
        return { ...prev, text: sanitized }
      })

      setTimeout(() => validateBulletText(sanitized), VALIDATION_DELAY)
    },
    [validateBulletText]
  )

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
    setExpandedSections(new Set())
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        setLocalData((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id)
          const newIndex = items.findIndex((item) => item.id === over.id)
          const newOrder = arrayMove(items, oldIndex, newIndex)
          setTimeout(() => onSave(newOrder), 0)
          return newOrder
        })
      }
      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [onSave]
  )

  // TODO: implement
  const handleAllBulletsRegenerate = () => {}

  const activeItem = useMemo(
    () => localData.find((item) => item.id === activeId),
    [localData, activeId]
  )

  const isAnyBulletBeingEdited = !!editingBullet
  const isAnyBulletRegenerating = !!regeneratingBullet

  const getExperienceBlockProps = (experience: ExperienceBlockData) => {
    const isEditingBullet = editingBullet?.section === experience.id
    const editingBulletIndex = isEditingBullet ? editingBullet.index : null

    return {
      data: experience,
      keywordData,
      editingBulletIndex,
      settings,
      isRegenerating: regeneratingBullet?.section === experience.id,
      regeneratingBullet,
      editingBulletText: isEditingBullet ? editingBullet.text : '',
      bulletErrors: isEditingBullet ? editingBullet.errors || {} : {},
      onTextareaChange: handleBulletTextUpdate,
      onEditBullet: handleBulletEdit,
      onBulletCancel: handleCancelEdit,
      onAddBullet: (sectionId: string) => handleAddBullet(sectionId, false),
      onBulletSave: () => handleBulletSave(true),
      onBulletDelete: (sectionId: string, index: number) =>
        handleBulletDelete(sectionId, index, true),
      onLockToggle: (sectionId: string, index: number) =>
        handleLockToggle(sectionId, index, true),
    }
  }

  const renderEditableBlock = (
    experience: ExperienceBlockData,
    existingBlocks: ExperienceBlockData[]
  ) => {
    const sharedProps = getExperienceBlockProps(experience)
    const isNew = experience.id === newBlockId
    const showCloseButton = existingBlocks.length > 1 || !isNew

    return (
      <EditableExperienceBlock
        {...sharedProps}
        key={experience.id}
        isNew={isNew}
        onDelete={handleSectionDelete}
        onClose={showCloseButton ? handleSectionClose : undefined}
        onSave={handleExperienceSave}
        onRegenerateBullet={(sectionId, index, formData, shouldSave) =>
          handleBulletRegenerate(sectionId, index, formData, shouldSave)
        }
      />
    )
  }

  const renderDraggableBlock = (
    experience: ExperienceBlockData,
    isOverlay = false
  ) => {
    const sharedProps = getExperienceBlockProps(experience)

    if (isOverlay) {
      return (
        <DraggableExperienceBlock
          {...sharedProps}
          key={experience.id}
          keywordData={null}
          editingBulletIndex={null}
          isRegenerating={false}
          regeneratingBullet={null}
          editingBulletText=''
          bulletErrors={{}}
          isOverlay={true}
          isExpanded={false}
          isDropping={false}
          isAnyBulletBeingEdited={false}
          isAnyBulletRegenerating={false}
          onDrawerToggle={() => {}}
          onBlockSelect={() => {}}
          onRegenerateBullet={() => {}}
          onRegenerateAllBullets={() => {}}
          onLockToggleAll={() => {}}
          onToggleInclude={() => {}}
        />
      )
    }

    return (
      <DraggableExperienceBlock
        {...sharedProps}
        key={experience.id}
        isDropping={isDropping}
        isExpanded={expandedSections.has(experience.id)}
        isAnyBulletBeingEdited={isAnyBulletBeingEdited}
        isAnyBulletRegenerating={isAnyBulletRegenerating}
        onDrawerToggle={() => toggleSectionExpanded(experience.id)}
        onBlockSelect={handleSectionSelect}
        onRegenerateBullet={(sectionId, index) =>
          handleBulletRegenerate(sectionId, index)
        }
        onRegenerateAllBullets={handleAllBulletsRegenerate}
        onLockToggleAll={(sectionId, shouldLock) =>
          handleLockToggleAll(sectionId, shouldLock)
        }
        onToggleInclude={(sectionId, isIncluded) =>
          handleSectionInclusion(sectionId, isIncluded)
        }
      />
    )
  }

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your work experience...' size='lg' />
      ) : (
        <div className={styles.experience}>
          <h2 className={styles.formTitle}>Work Experience</h2>
          {!selectedBlockId && localData.length > 0 && (
            <button
              type='button'
              className={styles.addButton}
              disabled={!!selectedBlockId || isAnyBulletRegenerating}
              onClick={handleSectionAdd}
            >
              <FaPlus size={12} />
              Add Work Experience
            </button>
          )}
          <div className={styles.experienceContainer}>
            {selectedBlockId ? (
              localData
                .filter((experience) => experience.id === selectedBlockId)
                .map((experience) => renderEditableBlock(experience, localData))
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext
                  items={localData.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={styles.experiencesContainer}>
                    {localData.map((experience) =>
                      renderDraggableBlock(experience)
                    )}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeItem && renderDraggableBlock(activeItem, true)}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default WorkExperience
