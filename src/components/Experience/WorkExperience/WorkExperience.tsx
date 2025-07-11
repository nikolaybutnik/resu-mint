import styles from './WorkExperience.module.scss'
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react'
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
import { useExperienceStore } from '@/stores'

interface WorkExperienceProps {
  keywordData: KeywordData
  loading: boolean
}

const WorkExperience: React.FC<WorkExperienceProps> = ({
  keywordData,
  loading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: workExperience, save } = useExperienceStore()

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)
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
    if (selectedBlockId && expandedSections.size > 0) {
      setExpandedSections(new Set())
    }
  }, [selectedBlockId, expandedSections])

  const createNewExperienceBlock = (id: string): ExperienceBlockData => ({
    id,
    title: '',
    description: '',
    startDate: { month: '' as Month, year: '' },
    endDate: { month: '' as Month, year: '', isPresent: false },
    companyName: '',
    location: '',
    bulletPoints: [],
    isIncluded: true,
  })

  const scrollToTop = () => {
    if (containerRef.current) {
      const sidebar = containerRef.current.closest('div[class*="sidebar"]')
      if (sidebar) {
        sidebar.scrollTop = 0
      }
    }
  }

  const handleSectionAdd = (): void => {
    const newBlockId = uuidv4()
    setSelectedBlockId(newBlockId)
    scrollToTop()
  }

  const handleSectionSelect = useCallback(
    (id: string) => {
      setSelectedBlockId(id)
      scrollToTop()
    },
    [scrollToTop]
  )

  const handleSectionClose = useCallback(() => {
    setSelectedBlockId(null)
    scrollToTop()
  }, [scrollToTop])

  const toggleSectionDrawer = useCallback((sectionId: string) => {
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

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
    setExpandedSections(new Set())
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = workExperience.findIndex(
          (item) => item.id === active.id
        )
        const newIndex = workExperience.findIndex((item) => item.id === over.id)
        const newOrder = arrayMove(workExperience, oldIndex, newIndex)
        save(newOrder)
      }
      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [workExperience, save]
  )

  const activeItem = useMemo(
    () => workExperience.find((item) => item.id === activeId),
    [workExperience, activeId]
  )

  const renderEditableBlock = (
    experience: ExperienceBlockData
  ): React.ReactNode => {
    return (
      <EditableExperienceBlock
        data={experience}
        keywordData={keywordData}
        key={experience.id}
        onClose={handleSectionClose}
      />
    )
  }

  const renderDraggableBlock = (
    experience: ExperienceBlockData,
    isOverlay = false
  ): React.ReactNode => {
    if (isOverlay) {
      return (
        <DraggableExperienceBlock
          data={experience}
          key={experience.id}
          keywordData={null}
          isOverlay={true}
          isExpanded={false}
          isDropping={false}
          onDrawerToggle={() => {}}
          onSectionEdit={() => {}}
        />
      )
    }

    return (
      <DraggableExperienceBlock
        data={experience}
        keywordData={keywordData}
        key={experience.id}
        isDropping={isDropping}
        isExpanded={expandedSections.has(experience.id)}
        onDrawerToggle={() => toggleSectionDrawer(experience.id)}
        onSectionEdit={handleSectionSelect}
      />
    )
  }

  const renderMainContent = (): React.ReactNode => {
    // Show currently selected block (existing or new)
    if (selectedBlockId) {
      const existingBlock = workExperience.find(
        (experience) => experience.id === selectedBlockId
      )
      return existingBlock
        ? renderEditableBlock(existingBlock)
        : renderEditableBlock(createNewExperienceBlock(selectedBlockId))
    }

    // Show default form when no data exists
    if (workExperience.length === 0) {
      return renderEditableBlock(createNewExperienceBlock(uuidv4()))
    }

    // Show drag-and-drop view when there is existing data
    return (
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
    )
  }

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your work experience...' size='lg' />
      ) : (
        <div ref={containerRef} className={styles.experience}>
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
            {renderMainContent()}
          </div>
        </div>
      )}
    </>
  )
}

export default WorkExperience
