import { useEffect, useMemo, useCallback, useState, useRef } from 'react'
import styles from './ReorderControlsWidget.module.scss'
import {
  useExperienceStore,
  useProjectStore,
  useEducationStore,
  useSkillsStore,
  useSettingsStore,
} from '@/stores'
import { ResumeSection } from '@/lib/types/settings'
import { FiBriefcase, FiFolder, FiBook, FiTool, FiLayers } from 'react-icons/fi'
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
import { DROPPING_ANIMATION_DURATION } from '@/lib/constants'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FaXmark } from 'react-icons/fa6'

const sectionIconMap = {
  [ResumeSection.EXPERIENCE]: FiBriefcase,
  [ResumeSection.PROJECTS]: FiFolder,
  [ResumeSection.EDUCATION]: FiBook,
  [ResumeSection.SKILLS]: FiTool,
}

interface DraggableSectionBlockProps {
  id: string
  sectionType: ResumeSection
  isOverlay?: boolean
  isDropping?: boolean
}

const DraggableSectionBlock: React.FC<DraggableSectionBlockProps> = ({
  id,
  sectionType,
  isOverlay = false,
  isDropping = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: isOverlay,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDropping ? 'transform 250ms ease' : transition,
  }

  const IconComponent = sectionIconMap[sectionType]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sectionBlock} ${isDragging ? styles.dragging : ''} ${
        isOverlay ? styles.overlay : ''
      } ${isDropping ? styles.dropping : ''}`}
      {...attributes}
      {...listeners}
    >
      <IconComponent className={styles.sectionIcon} />
      <span>{sectionType}</span>
    </div>
  )
}

const ReorderControls: React.FC = () => {
  const { data: experienceData } = useExperienceStore()
  const { data: projectsData } = useProjectStore()
  const { data: educationData } = useEducationStore()
  const { resumeSkillData: skillsData } = useSkillsStore()
  const { data: settings, saveOrder } = useSettingsStore()
  const { sectionOrder } = settings

  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)

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

  const sectionsWithContent = useMemo(() => {
    const contentMap = {
      [ResumeSection.EXPERIENCE]: !!experienceData.length,
      [ResumeSection.PROJECTS]: !!projectsData.length,
      [ResumeSection.EDUCATION]: !!educationData.length,
      [ResumeSection.SKILLS]: !!skillsData.length,
    }

    return sectionOrder.filter((sectionType) => contentMap[sectionType])
  }, [experienceData, projectsData, educationData, skillsData, sectionOrder])

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

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = sectionOrder.findIndex(
          (section) => section === active.id
        )
        const newIndex = sectionOrder.findIndex(
          (section) => section === over.id
        )
        const newOrder = arrayMove(sectionOrder, oldIndex, newIndex)

        saveOrder(newOrder)
      }

      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [sectionOrder, saveOrder]
  )

  const activeSection = useMemo(
    () => sectionsWithContent.find((section) => section === activeId),
    [sectionsWithContent, activeId]
  )

  // Don't render if less than 2 sections
  if (sectionsWithContent.length < 2) {
    return null
  }

  return (
    <div className={styles.controlsContainer}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext
          items={sectionsWithContent}
          strategy={verticalListSortingStrategy}
        >
          {sectionsWithContent.map((sectionType) => (
            <DraggableSectionBlock
              key={sectionType}
              id={sectionType}
              sectionType={sectionType}
              isDropping={isDropping}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeSection && (
            <DraggableSectionBlock
              id={activeSection}
              sectionType={activeSection}
              isOverlay={true}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

const ReorderControlsWidget: React.FC = () => {
  const widgetRef = useRef<HTMLDivElement>(null)

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div ref={widgetRef} className={styles.widget}>
      {!isExpanded ? (
        <button
          onClick={toggleExpanded}
          className={styles.collapsedControl}
          title='Reorder resume sections'
        >
          <FiLayers />
        </button>
      ) : (
        <div className={styles.expandedControl}>
          <div className={styles.expandedHeader}>
            <span>Section Order</span>
            <button onClick={toggleExpanded} className={styles.closeButton}>
              <FaXmark />
            </button>
          </div>
          <ReorderControls />
        </div>
      )}
    </div>
  )
}

export default ReorderControlsWidget
