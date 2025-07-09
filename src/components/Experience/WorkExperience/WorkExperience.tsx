import styles from './WorkExperience.module.scss'
import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { ExperienceBlockData, Month } from '@/lib/types/experience'
import EditableExperienceBlock from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import DraggableExperienceBlock from '@/components/Experience/DraggableExperienceBlock/DraggableExperienceBlock'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
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
import { MouseSensor, TouchSensor } from '@/lib/clientUtils'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import { FaPlus } from 'react-icons/fa'
import { DROPPING_ANIMATION_DURATION } from '@/lib/constants'
import { KeywordData } from '@/lib/types/keywords'
import { useExperienceStore, useSettingsStore } from '@/stores'

interface WorkExperienceProps {
  data: ExperienceBlockData[]
  keywordData: KeywordData
  loading: boolean
}

const WorkExperience: React.FC<WorkExperienceProps> = ({
  data,
  keywordData,
  loading,
}) => {
  const { data: settings } = useSettingsStore()
  const { data: workExperience } = useExperienceStore()

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

  const handleSectionDelete = useCallback(
    (id: string) => {
      const updatedData = workExperience.filter(
        (experience) => experience.id !== id
      )
      setSelectedBlockId(null)
      setNewBlockId(null)
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

  // TODO: update
  const handleSectionInclusion = useCallback(
    (sectionId: string, isIncluded: boolean) => {
      const updatedData = workExperience.map((experience) =>
        experience.id === sectionId ? { ...experience, isIncluded } : experience
      )
    },
    [workExperience]
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

  // TODO: will be triggered differently
  const expandSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      newSet.add(sectionId)
      return newSet
    })
  }, [])

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
      // updateExperience(updatedExperience)
    }

    setEditingBullet(null)
  }, [editingBullet, findExperience])

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
      onAddBullet: () => {},
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
        onSave={() => {}}
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
          isOverlay={true}
          isExpanded={false}
          isDropping={false}
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
        onDrawerToggle={() => toggleSectionExpanded(experience.id)}
        onBlockSelect={handleSectionSelect}
        onRegenerateAllBullets={handleAllBulletsRegenerate}
        onToggleInclude={(sectionId, isIncluded) =>
          handleSectionInclusion(sectionId, isIncluded)
        }
      />
    )
  }

  // TODO: deal with the lag on dragging, and fix items not being saved on drop
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
              disabled={!!selectedBlockId}
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
