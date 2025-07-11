import styles from './Projects.module.scss'
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { v4 as uuidv4 } from 'uuid'
import EditableProjectBlock from '../EditableProjectBlock/EditableProjectBlock'
import DraggableProjectBlock from '../DraggableProjectBlock/DraggableProjectBlock'
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
import { useProjectStore } from '@/stores'
import { Month, ProjectBlockData } from '@/lib/types/projects'

interface ProjectsProps {
  keywordData: KeywordData
  loading: boolean
}

const Projects: React.FC<ProjectsProps> = ({ keywordData, loading }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: projects, save } = useProjectStore()

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

  const createNewProjectBlock = (id: string): ProjectBlockData => ({
    id,
    title: '',
    technologies: [],
    description: '',
    startDate: { month: '' as Month, year: '' },
    endDate: { month: '' as Month, year: '', isPresent: false },
    bulletPoints: [],
    link: '',
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
        const oldIndex = projects.findIndex((item) => item.id === active.id)
        const newIndex = projects.findIndex((item) => item.id === over.id)
        const newOrder = arrayMove(projects, oldIndex, newIndex)
        save(newOrder)
      }
      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [projects, save]
  )

  const activeItem = useMemo(
    () => projects.find((item) => item.id === activeId),
    [projects, activeId]
  )

  const renderEditableBlock = (project: ProjectBlockData): React.ReactNode => {
    return (
      <EditableProjectBlock
        data={project}
        keywordData={keywordData}
        key={project.id}
        onClose={handleSectionClose}
      />
    )
  }

  const renderDraggableBlock = (
    project: ProjectBlockData,
    isOverlay = false
  ): React.ReactNode => {
    if (isOverlay) {
      return (
        <DraggableProjectBlock
          data={project}
          key={project.id}
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
      <DraggableProjectBlock
        data={project}
        keywordData={keywordData}
        key={project.id}
        isDropping={isDropping}
        isExpanded={expandedSections.has(project.id)}
        onDrawerToggle={() => toggleSectionDrawer(project.id)}
        onSectionEdit={handleSectionSelect}
      />
    )
  }

  const renderMainContent = (): React.ReactNode => {
    // Show currently selected block (existing or new)
    if (selectedBlockId) {
      const existingBlock = projects.find(
        (project) => project.id === selectedBlockId
      )
      return existingBlock
        ? renderEditableBlock(existingBlock)
        : renderEditableBlock(createNewProjectBlock(selectedBlockId))
    }

    // Show default form when no data exists
    if (projects.length === 0) {
      return renderEditableBlock(createNewProjectBlock(uuidv4()))
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
          items={projects.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.projectsContainer}>
            {projects.map((project) => renderDraggableBlock(project))}
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
        <LoadingSpinner text='Loading your projects...' size='lg' />
      ) : (
        <div ref={containerRef} className={styles.projects}>
          <h2 className={styles.formTitle}>Projects</h2>
          {!selectedBlockId && projects.length > 0 && (
            <button
              type='button'
              className={styles.addButton}
              disabled={!!selectedBlockId}
              onClick={handleSectionAdd}
            >
              <FaPlus size={12} />
              Add Project
            </button>
          )}
          <div className={styles.projectsContainer}>{renderMainContent()}</div>
        </div>
      )}
    </>
  )
}

export default Projects
