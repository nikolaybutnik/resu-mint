import styles from './Projects.module.scss'
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner'
import { v4 as uuidv4 } from 'uuid'
import EditableProjectBlock from '../EditableProjectBlock/EditableProjectBlock'
import DraggableProjectBlock from '../DraggableProjectBlock/DraggableProjectBlock'
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
import { bulletService } from '@/lib/services'
import { sanitizeResumeBullet } from '@/lib/utils'
import { BulletPointErrors } from '@/lib/types/errors'
import { DROPPING_ANIMATION_DURATION, VALIDATION_DELAY } from '@/lib/constants'
import isEqual from 'lodash/isEqual'

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

  const findProject = useCallback(
    (id: string) => localData.find((project) => project.id === id),
    [localData]
  )

  const updateProject = useCallback((updatedProject: ProjectBlockData) => {
    setLocalData((prev) =>
      prev.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      )
    )
  }, [])

  const handleSectionDelete = useCallback(
    (id: string) => {
      const updatedData = localData.filter((project) => project.id !== id)
      setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleSectionAdd = () => {
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

  const handleProjectSave = useCallback(
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

  const handleLockToggle = useCallback(
    (sectionId: string, index?: number) => {
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
      onSave(updatedData)
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

  const handleBulletRegenerate = useCallback(
    async (sectionId: string, index: number, isProjectEditForm: boolean) => {
      const projectData = findProject(sectionId)
      if (!projectData) return

      try {
        setRegeneratingBullet({ section: sectionId, index })

        const bulletToRegenerate = projectData.bulletPoints[index]
        const existingBullets = projectData.bulletPoints.filter(
          (bullet) => bullet.id !== bulletToRegenerate.id
        )

        const bullets = await bulletService.generateBullets({
          sectionType: 'project',
          sectionDescription: projectData.description,
          existingBullets,
          jobDescriptionAnalysis,
          maxCharsPerBullet: settings.maxCharsPerBullet,
        })

        if (bullets.length > 0) {
          const regeneratedText = bullets[0]

          // If bullet in edit mode, update textarea only
          if (
            editingBullet &&
            editingBullet.section === sectionId &&
            editingBullet.index === index
          ) {
            setEditingBullet((prev) => {
              if (!prev) return null
              return { ...prev, text: regeneratedText }
            })
          } else {
            // Else, update bullet in local state
            const updatedBullets = projectData.bulletPoints.map((bullet) =>
              bullet.id === bulletToRegenerate.id
                ? { ...bullet, text: regeneratedText }
                : bullet
            )

            const updatedProject = {
              ...projectData,
              bulletPoints: updatedBullets,
            }

            updateProject(updatedProject)

            const shouldSaveToStorage = !isProjectEditForm

            if (shouldSaveToStorage) {
              onSave(
                localData.map((project) =>
                  project.id === sectionId ? updatedProject : project
                )
              )
            }
          }

          validateBulletText(regeneratedText)
        }
      } catch (error) {
        console.error('Error regenerating bullet', error)
      } finally {
        setRegeneratingBullet(null)
      }
    },
    [
      findProject,
      jobDescriptionAnalysis,
      localData,
      onSave,
      settings.maxCharsPerBullet,
      updateProject,
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
      const project = findProject(sectionId)
      if (!project) return

      const newBullet = {
        id: uuidv4(),
        text: '',
        isLocked: false,
      }

      const updatedProject = {
        ...project,
        bulletPoints: [...project.bulletPoints, newBullet],
      }

      updateProject(updatedProject)

      expandSection(sectionId)

      setEditingBullet({
        section: sectionId,
        index: updatedProject.bulletPoints.length - 1,
        text: '',
      })

      if (shouldSave) {
        onSave(
          localData.map((project) =>
            project.id === sectionId ? updatedProject : project
          )
        )
      }
    },
    [findProject, updateProject, expandSection, localData, onSave]
  )

  const handleBulletEdit = useCallback(
    (sectionId: string, index: number) => {
      const project = findProject(sectionId)
      if (!project) return

      setEditingBullet({
        section: sectionId,
        index,
        text: project.bulletPoints[index].text,
      })
    },
    [findProject]
  )

  const handleBulletSave = useCallback(
    (shouldSave = true) => {
      if (!editingBullet) return

      const { section: sectionId, index, text } = editingBullet
      const project = findProject(sectionId)
      if (!project) return

      const sanitized = sanitizeResumeBullet(text, true)
      if (sanitized.trim() === '') return

      const updatedProject = {
        ...project,
        bulletPoints: project.bulletPoints.map((bullet, idx) =>
          idx === index ? { ...bullet, text: sanitized } : bullet
        ),
      }

      updateProject(updatedProject)

      if (shouldSave) {
        onSave(
          localData.map((project) =>
            project.id === sectionId ? updatedProject : project
          )
        )
      }

      setEditingBullet(null)
    },
    [editingBullet, findProject, localData, onSave, updateProject]
  )

  const handleCancelEdit = useCallback(() => {
    if (!editingBullet) return

    const { section: sectionId, index } = editingBullet
    const project = findProject(sectionId)
    if (!project) return

    // If new bullet, remove
    if (
      index === project.bulletPoints.length - 1 &&
      project.bulletPoints[index].text === ''
    ) {
      const updatedProject = {
        ...project,
        bulletPoints: project.bulletPoints.slice(0, -1),
      }
      updateProject(updatedProject)
    }

    setEditingBullet(null)
  }, [editingBullet, findProject, updateProject])

  const handleBulletDelete = useCallback(
    (sectionId: string, index: number, shouldSave = true) => {
      const project = findProject(sectionId)
      if (!project) return

      const updatedProject = {
        ...project,
        bulletPoints: project.bulletPoints.filter((_, idx) => idx !== index),
      }

      updateProject(updatedProject)

      if (shouldSave) {
        onSave(
          localData.map((project) =>
            project.id === sectionId ? updatedProject : project
          )
        )
      }
    },
    [findProject, localData, onSave, updateProject]
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
          `Your char limit is set to ${settings.maxCharsPerBullet}. For best results, keep each bullet consistent in length.`,
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

  const isAnyBulletBeingEdited = !!editingBullet
  const isAnyBulletRegenerating = !!regeneratingBullet

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
            disabled={!!selectedBlockId || isAnyBulletRegenerating}
            onClick={handleSectionAdd}
          >
            Add Project
          </button>
          <div className={styles.projectsContainer}>
            {selectedBlockId ? (
              localData
                .filter((project) => project.id === selectedBlockId)
                .map((project) => {
                  const isNew = project.id === newBlockId
                  const isEditingBullet = editingBullet?.section === project.id
                  const editingBulletIndex = isEditingBullet
                    ? editingBullet.index
                    : null

                  return (
                    <EditableProjectBlock
                      key={project.id}
                      data={project}
                      isNew={isNew}
                      editingBulletIndex={editingBulletIndex}
                      settings={settings}
                      isRegenerating={
                        regeneratingBullet?.section === project.id
                      }
                      regeneratingBullet={regeneratingBullet}
                      editingBulletText={
                        isEditingBullet ? editingBullet.text : ''
                      }
                      bulletErrors={
                        isEditingBullet ? editingBullet.errors || {} : {}
                      }
                      onDelete={handleSectionDelete}
                      onClose={handleSectionClose}
                      onSave={handleProjectSave}
                      onRegenerateBullet={(sectionId, index) =>
                        handleBulletRegenerate(sectionId, index, true)
                      }
                      onAddBullet={(sectionId) =>
                        handleAddBullet(sectionId, false)
                      }
                      onEditBullet={handleBulletEdit}
                      onBulletSave={() => handleBulletSave(false)}
                      onBulletCancel={handleCancelEdit}
                      onBulletDelete={(sectionId, index) =>
                        handleBulletDelete(sectionId, index, false)
                      }
                      onTextareaChange={handleBulletTextUpdate}
                      onLockToggle={(sectionId, index) => {
                        handleLockToggle(sectionId, index)
                      }}
                      onLockToggleAll={(sectionId, shouldLock) => {
                        handleLockToggleAll(sectionId, shouldLock)
                      }}
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
                  {localData.map((project) => {
                    const isEditingBullet =
                      editingBullet?.section === project.id
                    const editingBulletIndex = isEditingBullet
                      ? editingBullet.index
                      : null

                    return (
                      <DraggableProjectBlock
                        key={project.id}
                        data={project}
                        editingBulletIndex={editingBulletIndex}
                        settings={settings}
                        isRegenerating={
                          regeneratingBullet?.section === project.id
                        }
                        regeneratingBullet={regeneratingBullet}
                        onBlockSelect={handleSectionSelect}
                        onEditBullets={handleProjectSave}
                        onRegenerateBullet={(sectionId, index) =>
                          handleBulletRegenerate(sectionId, index, false)
                        }
                        onAddBullet={(sectionId) =>
                          handleAddBullet(sectionId, false)
                        }
                        onEditBullet={handleBulletEdit}
                        onBulletSave={() => handleBulletSave(true)}
                        onBulletCancel={handleCancelEdit}
                        onBulletDelete={(sectionId, index) =>
                          handleBulletDelete(sectionId, index, true)
                        }
                        onTextareaChange={handleBulletTextUpdate}
                        editingBulletText={
                          isEditingBullet ? editingBullet.text : ''
                        }
                        bulletErrors={
                          isEditingBullet ? editingBullet.errors || {} : {}
                        }
                        isDropping={isDropping}
                        isExpanded={expandedSections.has(project.id)}
                        onDrawerToggle={() => toggleSectionExpanded(project.id)}
                        isAnyBulletBeingEdited={isAnyBulletBeingEdited}
                        isAnyBulletRegenerating={isAnyBulletRegenerating}
                        onLockToggle={(sectionId, index) => {
                          handleLockToggle(sectionId, index)
                        }}
                        onLockToggleAll={(sectionId, shouldLock) => {
                          handleLockToggleAll(sectionId, shouldLock)
                        }}
                      />
                    )
                  })}
                </SortableContext>
                <DragOverlay>
                  {activeItem ? (
                    <DraggableProjectBlock
                      data={activeItem}
                      editingBulletIndex={
                        editingBullet?.section === activeItem.id
                          ? editingBullet.index
                          : null
                      }
                      settings={settings}
                      isRegenerating={
                        regeneratingBullet?.section === activeItem.id
                      }
                      regeneratingBullet={regeneratingBullet}
                      onBlockSelect={handleSectionSelect}
                      onEditBullets={handleProjectSave}
                      onRegenerateBullet={(sectionId, index) =>
                        handleBulletRegenerate(sectionId, index, false)
                      }
                      onAddBullet={(sectionId) =>
                        handleAddBullet(sectionId, false)
                      }
                      onEditBullet={handleBulletEdit}
                      onBulletSave={() => handleBulletSave(true)}
                      onBulletCancel={handleCancelEdit}
                      onBulletDelete={(sectionId, index) =>
                        handleBulletDelete(sectionId, index, true)
                      }
                      onTextareaChange={handleBulletTextUpdate}
                      editingBulletText={
                        editingBullet?.section === activeItem.id
                          ? editingBullet.text
                          : ''
                      }
                      bulletErrors={
                        editingBullet?.section === activeItem.id
                          ? editingBullet.errors || {}
                          : {}
                      }
                      isOverlay={true}
                      isExpanded={expandedSections.has(activeItem.id)}
                      onDrawerToggle={() => {}} // No-op for overlay
                      isAnyBulletBeingEdited={isAnyBulletBeingEdited}
                      isAnyBulletRegenerating={isAnyBulletRegenerating}
                      onLockToggle={(_sectionId, _index) => {}}
                      onLockToggleAll={(_sectionId, _shouldLock) => {}}
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
