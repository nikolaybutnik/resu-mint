import styles from './WorkExperience.module.scss'
import React, { useCallback, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ExperienceBlockData,
  Month,
} from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import EditableExperienceBlock from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { DraggableExperienceBlock } from '../DraggableExperienceBlock/DraggableExperienceBlock'
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { PointerSensor } from '@/lib/utils'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers'

interface WorkExperienceProps {
  data: ExperienceBlockData[]
  loading: boolean
  onSave: (data: ExperienceBlockData[]) => void
}

const WorkExperience: React.FC<WorkExperienceProps> = ({
  data,
  loading,
  onSave,
}) => {
  const [localData, setLocalData] = useState<ExperienceBlockData[]>(data)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [newBlockId, setNewBlockId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDropping, setIsDropping] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleBlockDelete = useCallback(
    (id: string): void => {
      const updatedData = localData.filter((exp) => exp.id !== id)
      setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleBlockAdd = useCallback((): void => {
    const newBlock: ExperienceBlockData = {
      id: uuidv4(),
      jobTitle: '',
      startDate: { month: '' as Month, year: '' },
      endDate: { month: '' as Month, year: '', isPresent: false },
      companyName: '',
      location: '',
      description: '',
      bulletPoints: [],
    }
    const updatedData = [...localData, newBlock]
    setLocalData(updatedData)
    setSelectedBlockId(newBlock.id)
    setNewBlockId(newBlock.id)
  }, [localData])

  const handleBlockSelect = useCallback((id: string): void => {
    setSelectedBlockId(id)
  }, [])

  const handleBlockClose = useCallback((): void => {
    setSelectedBlockId(null)
    setNewBlockId(null)
    setLocalData(data)
  }, [data])

  const handleSave = useCallback(
    (updatedBlock: ExperienceBlockData): void => {
      const updatedData = localData.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      )
      setLocalData(updatedData)
      onSave(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
    },
    [localData, onSave]
  )

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }

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
      setTimeout(() => setIsDropping(false), 250) // Match DragOverlay drop animation duration
    },
    [onSave]
  )

  const activeItem = localData.find((item) => item.id === activeId)

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your experience...' size='lg' />
      ) : (
        <div className={styles.workExperience}>
          <h2 className={styles.formTitle}>Experience</h2>
          <button
            type='button'
            className={styles.addButton}
            disabled={!!selectedBlockId}
            onClick={handleBlockAdd}
          >
            Add Experience
          </button>
          <div className={styles.experienceContainer}>
            {selectedBlockId ? (
              localData
                .filter((experience) => experience.id === selectedBlockId)
                .map((experience) => {
                  const isNew = experience.id === newBlockId
                  return (
                    <EditableExperienceBlock
                      key={experience.id}
                      data={experience}
                      isNew={isNew}
                      onDelete={handleBlockDelete}
                      onClose={handleBlockClose}
                      onSave={handleSave}
                    />
                  )
                })
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
                  {localData.map((experience) => (
                    <DraggableExperienceBlock
                      key={experience.id}
                      data={experience}
                      onBlockSelect={handleBlockSelect}
                      isDropping={isDropping}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeItem ? (
                    <DraggableExperienceBlock
                      data={activeItem}
                      onBlockSelect={handleBlockSelect}
                      isOverlay={true}
                    />
                  ) : null}
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
