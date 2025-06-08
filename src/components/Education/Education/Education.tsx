import styles from './Education.module.scss'
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner'
import { DegreeStatus, EducationBlockData, Month } from '@/lib/types/education'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensors,
} from '@dnd-kit/core'
import { useSensor } from '@dnd-kit/core'
import { KeyboardSensor } from '@dnd-kit/core'
import { PointerSensor } from '@/lib/utils'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { v4 as uuidv4 } from 'uuid'
import { DROPPING_ANIMATION_DURATION } from '@/lib/constants'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import EditableEducationBlock from '../EditableEducationBlock/EditableEducationBlock'

interface EducationProps {
  data: EducationBlockData[]
  loading: boolean
  onSave: (data: EducationBlockData[]) => void
}

const Education = ({ data, loading, onSave }: EducationProps) => {
  const [localData, setLocalData] = useState<EducationBlockData[]>(data)
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

  const findEducation = useCallback(
    (id: string) => localData.find((education) => education.id === id),
    [localData]
  )

  const updateEducation = useCallback(
    (updatedEducation: EducationBlockData) => {
      setLocalData((prev) =>
        prev.map((education) =>
          education.id === updatedEducation.id ? updatedEducation : education
        )
      )
    },
    []
  )

  const handleSectionDelete = useCallback(
    (id: string) => {
      const updatedData = localData.filter((education) => education.id !== id)
      setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleSectionAdd = () => {
    const newBlock: EducationBlockData = {
      id: uuidv4(),
      institution: '',
      degree: '',
      degreeStatus: '' as DegreeStatus,
      startDate: { month: '' as Month, year: '' },
      endDate: { month: '' as Month, year: '' },
      location: '',
      description: '',
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
    setLocalData(data)
  }, [data])

  const handleSectionInclusion = useCallback(
    (sectionId: string, isIncluded: boolean) => {
      const updatedData = localData.map((education) =>
        education.id === sectionId ? { ...education, isIncluded } : education
      )
      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleEducationSave = useCallback(
    (updatedBlock: EducationBlockData) => {
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

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
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

  const activeItem = useMemo(
    () => localData.find((item) => item.id === activeId),
    [localData, activeId]
  )

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your education...' size='lg' />
      ) : (
        <div className={styles.education}>
          <h2 className={styles.formTitle}>Education</h2>
          <button
            type='button'
            className={styles.addButton}
            disabled={!!selectedBlockId}
            onClick={handleSectionAdd}
          >
            <FaPlus size={12} />
            Add Education
          </button>

          <div className={styles.educationContainer}>
            {selectedBlockId ? (
              localData
                .filter((education) => education.id === selectedBlockId)
                .map((education) => {
                  const isNew = education.id === newBlockId

                  return (
                    <EditableEducationBlock
                      key={education.id}
                      data={education}
                      isNew={isNew}
                      onDelete={handleSectionDelete}
                      onClose={handleSectionClose}
                      onSave={handleEducationSave}
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
                  {localData.map((education) => {
                    return <div key={education.id}>DraggableEducationBlock</div>
                  })}
                </SortableContext>
                <DragOverlay>
                  {activeItem ? <div>DraggableEducationBlock</div> : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Education
