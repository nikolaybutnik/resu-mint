import styles from './WorkExperience.module.scss'
import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { BulletPoint, ExperienceBlockData, Month } from '@/lib/types/experience'
import EditableExperienceBlock from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import DraggableExperienceBlock from '@/components/Experience/DraggableExperienceBlock/DraggableExperienceBlock'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { GenerateBulletsRequest, JobDescriptionAnalysis } from '@/lib/types/api'
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
import { DROPPING_ANIMATION_DURATION } from '@/lib/constants'
import { KeywordData } from '@/lib/types/keywords'
import { useExperienceStore, useSettingsStore } from '@/stores'

interface WorkExperienceProps {
  data: ExperienceBlockData[]
  keywordData: KeywordData
  jobDescriptionAnalysis: JobDescriptionAnalysis
  loading: boolean
}

const WorkExperience: React.FC<WorkExperienceProps> = ({
  data,
  keywordData,
  jobDescriptionAnalysis,
  loading,
}) => {
  const { data: settings } = useSettingsStore()
  const { data: workExperience } = useExperienceStore()

  useEffect(() => {
    console.log('workExperience', workExperience)
  }, [workExperience])

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

  // TODO: auto add new section mechanism
  // useEffect(() => {
  //   if (workExperience.length === 0 && !selectedBlockId && !newBlockId && !loading) {
  //     handleSectionAdd()
  //   }
  // }, [workExperience.length, selectedBlockId, newBlockId, loading])

  const findExperience = (id: string) =>
    workExperience.find((experience) => experience.id === id)

  const updateExperience = useCallback(
    (updatedExperience: ExperienceBlockData) => {
      // setLocalData((prev) =>
      //   prev.map((experience) =>
      //     experience.id === updatedExperience.id
      //       ? updatedExperience
      //       : experience
      //   )
      // )
    },
    []
  )

  const handleSectionDelete = useCallback(
    (id: string) => {
      const updatedData = workExperience.filter(
        (experience) => experience.id !== id
      )
      // setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      // onSave(updatedData)
    },
    [workExperience]
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
  }, [data])

  const handleSectionInclusion = useCallback(
    (sectionId: string, isIncluded: boolean) => {
      const updatedData = workExperience.map((experience) =>
        experience.id === sectionId ? { ...experience, isIncluded } : experience
      )
    },
    [workExperience]
  )

  const handleExperienceSave = useCallback(
    (updatedBlock: ExperienceBlockData) => {
      const updatedData = workExperience.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      )
      // setLocalData(updatedData)
      // onSave(updatedData)
    },
    [workExperience]
  )

  const handleLockToggleAll = useCallback(
    (sectionId: string, shouldLock: boolean) => {
      const updatedData = workExperience.map((block) =>
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

      // setLocalData(updatedData)
      // onSave(updatedData)
    },
    [workExperience]
  )

  /**
   * Regenerates a single bullet point for a experience section.
   * @param sectionId - The ID of the experience section to regenerate.
   * @param index - The index of the bullet point to regenerate.
   * @param formData - The form data of the experience block if it is being edited.
   * @param shouldSave - Whether to save the regenerated bullet to storage.
   */
  // const handleBulletRegenerate = useCallback(
  //   async (
  //     sectionId: string,
  //     index: number,
  //     formData?: ExperienceBlockData,
  //     shouldSave?: boolean
  //   ) => {
  //     const data = formData || findExperience(sectionId)
  //     if (!data) return

  //     try {
  //       setRegeneratingBullet({ section: sectionId, index })

  //       let regeneratingBulletId: string | null = null
  //       let existingBullets: BulletPoint[] = []
  //       let payloadSection: GenerateBulletsRequest['sections'] = []

  //       if (formData) {
  //         regeneratingBulletId = formData.bulletPoints[index].id
  //         existingBullets = formData.bulletPoints.filter(
  //           (bullet) => bullet.id !== regeneratingBulletId
  //         )
  //         payloadSection = [
  //           {
  //             id: sectionId,
  //             type: 'experience',
  //             title: formData.title,
  //             description: formData.description || '',
  //             existingBullets: formData.bulletPoints
  //               .filter((bullet) => bullet.id !== regeneratingBulletId)
  //               .map((bp) => ({ ...bp, isLocked: bp.isLocked ?? false })),
  //             targetBulletIds: [regeneratingBulletId],
  //           },
  //         ]
  //       } else {
  //         regeneratingBulletId = data.bulletPoints[index].id
  //         existingBullets = data.bulletPoints.filter(
  //           (bullet) => bullet.id !== regeneratingBulletId
  //         )
  //         payloadSection = [
  //           {
  //             id: sectionId,
  //             type: 'experience',
  //             title: data.title,
  //             description: data.description || '',
  //             existingBullets: existingBullets.map((bp) => ({
  //               ...bp,
  //               isLocked: bp.isLocked ?? false,
  //             })),
  //             targetBulletIds: [regeneratingBulletId],
  //           },
  //         ]
  //       }

  //       const payload: GenerateBulletsRequest = {
  //         sections: payloadSection,
  //         jobDescriptionAnalysis,
  //         settings,
  //         numBullets: 1,
  //       }

  //       const generatedData = await bulletService.generateBullets(payload)

  //       if (generatedData.length > 0) {
  //         const [generatedSection] = generatedData
  //         const [generatedBullet] = generatedSection.bullets

  //         // If bullet in edit mode, update textarea only
  //         if (
  //           editingBullet &&
  //           editingBullet.section === sectionId &&
  //           editingBullet.index === index
  //         ) {
  //           setEditingBullet((prev) => {
  //             if (!prev) return null
  //             return { ...prev, text: generatedBullet.text }
  //           })
  //         } else {
  //           // Else, update bullet in local state
  //           const sourceData = formData || data
  //           const updatedBullets = sourceData.bulletPoints.map((bullet) =>
  //             bullet.id === regeneratingBulletId
  //               ? { ...bullet, text: generatedBullet.text }
  //               : bullet
  //           )
  //           const updatedExperience = {
  //             ...sourceData,
  //             bulletPoints: updatedBullets,
  //           }

  //           updateExperience(updatedExperience)
  //           // Use explicit shouldSave parameter, or default to !formData for backwards compatibility
  //           const shouldSaveToStorage =
  //             shouldSave !== undefined ? shouldSave : !formData
  //           if (shouldSaveToStorage) {
  //             onSave(
  //               workExperience.map((experience) =>
  //                 experience.id === sectionId ? updatedExperience : experience
  //               )
  //             )
  //           }
  //         }

  //         // validateBulletText(generatedBullet.text)
  //       }
  //     } catch (error) {
  //       console.error('Error regenerating bullet', error)
  //     } finally {
  //       setRegeneratingBullet(null)
  //     }
  //   },
  //   [
  //     findExperience,
  //     jobDescriptionAnalysis,
  //     workExperience,
  //     onSave,
  //     settings.maxCharsPerBullet,
  //     updateExperience,
  //     editingBullet,
  //   ]
  // )

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
    },
    [findExperience, updateExperience, expandSection, workExperience]
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

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
    setExpandedSections(new Set())
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      //   setLocalData((items) => {
      //     const oldIndex = items.findIndex((item) => item.id === active.id)
      //     const newIndex = items.findIndex((item) => item.id === over.id)
      //     const newOrder = arrayMove(items, oldIndex, newIndex)
      //     setTimeout(() => onSave(newOrder), 0)
      //     return newOrder
      //   })
    }
    setActiveId(null)
    setIsDropping(true)
    setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
  }, [])

  // TODO: implement via bulletService
  const handleAllBulletsRegenerate = () => {}

  const activeItem = useMemo(
    () => workExperience.find((item) => item.id === activeId),
    [workExperience, activeId]
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
      onEditBullet: handleBulletEdit,
      onBulletCancel: handleCancelEdit,
      onAddBullet: (sectionId: string) => handleAddBullet(sectionId, false),
      onBulletSave: () => {},
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
        onRegenerateBullet={() => {}}
        onLockToggle={() => {}}
        onBulletDelete={() => {}}
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
          isOverlay={true}
          isExpanded={false}
          isDropping={false}
          isAnyBulletBeingEdited={false}
          isAnyBulletRegenerating={false}
          onDrawerToggle={() => {}}
          onBlockSelect={() => {}}
          onRegenerateAllBullets={() => {}}
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
        onRegenerateAllBullets={handleAllBulletsRegenerate}
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
          {!selectedBlockId && workExperience.length > 0 && (
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
              workExperience
                .filter((experience) => experience.id === selectedBlockId)
                .map((experience) =>
                  renderEditableBlock(experience, workExperience)
                )
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext
                  items={workExperience.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={styles.experiencesContainer}>
                    {workExperience.map((experience) =>
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
