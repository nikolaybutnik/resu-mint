import styles from './Education.module.scss'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import { DegreeStatus, EducationBlockData, Month } from '@/lib/types/education'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensors,
  useSensor,
  KeyboardSensor,
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor } from '@/lib/clientUtils'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { v4 as uuidv4 } from 'uuid'
import { DROPPING_ANIMATION_DURATION } from '@/lib/constants'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import EditableEducationBlock from '../EditableEducationBlock/EditableEducationBlock'
import DraggableEducationBlock from '../DraggableEducationBlock/DraggableEducationBlock'
import { useEducationStore } from '@/stores'

interface EducationProps {
  loading: boolean
}

const Education = ({ loading }: EducationProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: education, save } = useEducationStore()

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
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

  const createNewEducationBlock = (id: string): EducationBlockData => ({
    id,
    institution: '',
    degree: '',
    degreeStatus: '' as DegreeStatus,
    startDate: { month: '' as Month, year: '' },
    endDate: { month: '' as Month, year: '' },
    location: '',
    description: '',
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

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])
  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = education.findIndex((item) => item.id === active.id)
        const newIndex = education.findIndex((item) => item.id === over.id)
        const newOrder = arrayMove(education, oldIndex, newIndex)
        save(newOrder)
      }
      setActiveId(null)
      setIsDropping(true)
      setTimeout(() => setIsDropping(false), DROPPING_ANIMATION_DURATION)
    },
    [education, save]
  )

  const activeItem = useMemo(
    () => education.find((item) => item.id === activeId),
    [education, activeId]
  )

  const renderEditableBlock = (
    education: EducationBlockData
  ): React.ReactNode => {
    return (
      <EditableEducationBlock
        key={education.id}
        data={education}
        onClose={handleSectionClose}
      />
    )
  }

  const renderDraggableBlock = useCallback(
    (education: EducationBlockData, isOverlay = false): React.ReactNode => {
      if (isOverlay) {
        return (
          <DraggableEducationBlock
            key={education.id}
            data={education}
            isOverlay={true}
            isDropping={false}
            onSectionEdit={() => {}}
          />
        )
      }

      return (
        <DraggableEducationBlock
          key={education.id}
          data={education}
          isDropping={isDropping}
          onSectionEdit={handleSectionSelect}
        />
      )
    },
    [isDropping, handleSectionSelect]
  )

  const draggableBlocks = useMemo(
    () => education.map((education) => renderDraggableBlock(education)),
    [education, renderDraggableBlock]
  )

  const renderMainContent = (): React.ReactNode => {
    // Show currently selected block (existing or new)
    if (selectedBlockId) {
      const existingBlock = education.find(
        (education) => education.id === selectedBlockId
      )
      return existingBlock
        ? renderEditableBlock(existingBlock)
        : renderEditableBlock(createNewEducationBlock(selectedBlockId))
    }

    // Show default form when no data exists
    if (education.length === 0) {
      return renderEditableBlock(createNewEducationBlock(uuidv4()))
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
          items={education.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.educationContainer}>{draggableBlocks}</div>
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
        <LoadingSpinner text='Loading your education...' size='lg' />
      ) : (
        <div ref={containerRef} className={styles.education}>
          <h2 className={styles.formTitle}>Education</h2>
          {!selectedBlockId && education.length > 0 && (
            <button
              type='button'
              className={styles.addButton}
              disabled={!!selectedBlockId}
              onClick={handleSectionAdd}
            >
              <FaPlus size={12} />
              Add Education
            </button>
          )}

          <div className={styles.educationContainer}>{renderMainContent()}</div>
        </div>
      )}
    </>
  )
}

export default Education
