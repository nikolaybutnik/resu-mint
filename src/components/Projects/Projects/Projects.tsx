import styles from './Projects.module.scss'
import { useState, useEffect, useCallback, useMemo } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner'
import { v4 as uuidv4 } from 'uuid'
import EditableProjectBlock from '../EditableProjectBlock/EditableProjectBlock'
import { DraggableProjectBlock } from '../DraggableProjectBlock/DraggableProjectBlock'
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
import { JobDescriptionAnalysis } from '@/lib/types/api'
import { Month, ProjectBlockData } from '@/lib/types/projects'
import { AppSettings } from '@/lib/types/settings'

interface ProjectsProps {
  data: ProjectBlockData[]
  jobDescriptionAnalysis: JobDescriptionAnalysis
  settings: AppSettings
  loading: boolean
  onSave: (data: ProjectBlockData[]) => void
}

const Projects = ({
  data,
  jobDescriptionAnalysis,
  settings,
  loading,
  onSave,
}: ProjectsProps) => {
  const [localData, setLocalData] = useState<ProjectBlockData[]>(data)
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
    (id: string) => {
      const updatedData = localData.filter((project) => project.id !== id)
      setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleBlockAdd = useCallback(() => {
    const newBlock: ProjectBlockData = {
      id: uuidv4(),
      title: '',
      technologies: [],
      description: '',
      startDate: { month: '' as Month, year: '' },
      endDate: { month: '' as Month, year: '', isPresent: false },
      bulletPoints: [],
      link: '',
    }
    const updatedData = [...localData, newBlock]
    setLocalData(updatedData)
    setSelectedBlockId(newBlock.id)
    setNewBlockId(newBlock.id)
  }, [localData])

  const handleBlockSelect = useCallback((id: string) => {
    setSelectedBlockId(id)
  }, [])

  const handleBlockClose = useCallback(() => {
    // TODO: ask user if the want to save their changes (if form is valid and changes were made)
    setSelectedBlockId(null)
    setNewBlockId(null)
    setLocalData(data)
  }, [])

  const handleSave = useCallback(
    (updatedBlock: ProjectBlockData) => {
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
    // collapse all bullet drawers in draggable project block
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
      setTimeout(() => setIsDropping(false), 250) // Match DragOverlay drop animation duration
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
        <LoadingSpinner text='Loading your projects...' size='lg' />
      ) : (
        <div className={styles.projects}>
          <h2 className={styles.formTitle}>Projects</h2>
          <button
            type='button'
            className={styles.addButton}
            disabled={!!selectedBlockId}
            onClick={handleBlockAdd}
          >
            Add Project
          </button>
          <div className={styles.projectsContainer}>
            {selectedBlockId ? (
              localData
                .filter((project) => project.id === selectedBlockId)
                .map((project) => {
                  const isNew = project.id === newBlockId
                  return (
                    <EditableProjectBlock
                      key={project.id}
                      data={project}
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
                  {localData.map((project) => (
                    <DraggableProjectBlock
                      key={project.id}
                      data={project}
                      settings={settings}
                      jobDescriptionAnalysis={jobDescriptionAnalysis}
                      onBlockSelect={handleBlockSelect}
                      onEditBullets={handleSave}
                      isDropping={isDropping}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeItem ? (
                    <DraggableProjectBlock
                      data={activeItem}
                      settings={settings}
                      jobDescriptionAnalysis={jobDescriptionAnalysis}
                      onBlockSelect={handleBlockSelect}
                      onEditBullets={handleSave}
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

export default Projects
