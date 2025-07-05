import styles from './Projects.module.scss'
import { useState, useEffect, useCallback, useMemo } from 'react'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
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
import { MouseSensor, TouchSensor } from '@/lib/clientUtils'
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
import { GenerateBulletsRequest, JobDescriptionAnalysis } from '@/lib/types/api'
import { BulletPoint, Month, ProjectBlockData } from '@/lib/types/projects'
import { bulletService } from '@/lib/services'
import { sanitizeResumeBullet } from '@/lib/utils'
import { BulletPointErrors } from '@/lib/types/errors'
import { DROPPING_ANIMATION_DURATION, VALIDATION_DELAY } from '@/lib/constants'
import isEqual from 'lodash/isEqual'
import { FaPlus } from 'react-icons/fa'
import { KeywordData } from '@/lib/types/keywords'
import { useSettingsStore } from '@/stores/settingsStore'

interface ProjectsProps {
  data: ProjectBlockData[]
  keywordData: KeywordData
  jobDescriptionAnalysis: JobDescriptionAnalysis
  loading: boolean
  onSave: (data: ProjectBlockData[]) => void
}

const Projects = ({
  data,
  keywordData,
  jobDescriptionAnalysis,
  loading,
  onSave,
}: ProjectsProps) => {
  const { data: settings } = useSettingsStore()

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
    setLocalData(data)
  }, [data])

  useEffect(() => {
    if (localData.length === 0 && !selectedBlockId && !newBlockId && !loading) {
      handleSectionAdd()
    }
  }, [localData.length, selectedBlockId, newBlockId, loading])

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
    setEditingBullet(null)
    setLocalData(data)
  }, [data])

  const handleSectionInclusion = useCallback(
    (sectionId: string, isIncluded: boolean) => {
      const updatedData = localData.map((project) =>
        project.id === sectionId ? { ...project, isIncluded } : project
      )
      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleProjectSave = useCallback(
    (updatedBlock: ProjectBlockData) => {
      const updatedData = localData.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      )
      setLocalData(updatedData)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleLockToggle = useCallback(
    (sectionId: string, index: number, shouldSave: boolean) => {
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

      if (shouldSave) {
        onSave(updatedData)
      }
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

  /**
   * Regenerates a single bullet point for a project section.
   * @param sectionId - The ID of the project section to regenerate.
   * @param index - The index of the bullet point to regenerate.
   * @param formData - The form data of the project block if it is being edited.
   * @param shouldSave - Whether to save the regenerated bullet to storage.
   */
  const handleBulletRegenerate = useCallback(
    async (
      sectionId: string,
      index: number,
      formData?: ProjectBlockData,
      shouldSave?: boolean
    ) => {
      const data = formData || findProject(sectionId)
      if (!data) return

      try {
        setRegeneratingBullet({ section: sectionId, index })

        let regeneratingBulletId: string | null = null
        let existingBullets: BulletPoint[] = []
        let payloadSection: GenerateBulletsRequest['sections'] = []

        if (formData) {
          regeneratingBulletId = formData.bulletPoints[index].id
          existingBullets = formData.bulletPoints.filter(
            (bullet) => bullet.id !== regeneratingBulletId
          )
          payloadSection = [
            {
              id: sectionId,
              type: 'project',
              title: formData.title,
              technologies: formData.technologies,
              description: formData.description || '',
              existingBullets: formData.bulletPoints
                .filter((bullet) => bullet.id !== regeneratingBulletId)
                .map((bp) => ({ ...bp, isLocked: bp.isLocked ?? false })),
              targetBulletIds: [regeneratingBulletId],
            },
          ]
        } else {
          regeneratingBulletId = data.bulletPoints[index].id
          existingBullets = data.bulletPoints.filter(
            (bullet) => bullet.id !== regeneratingBulletId
          )
          payloadSection = [
            {
              id: sectionId,
              type: 'project',
              title: data.title,
              technologies: data.technologies,
              description: data.description || '',
              existingBullets: existingBullets.map((bp) => ({
                ...bp,
                isLocked: bp.isLocked ?? false,
              })),
              targetBulletIds: [regeneratingBulletId],
            },
          ]
        }

        const payload: GenerateBulletsRequest = {
          sections: payloadSection,
          jobDescriptionAnalysis,
          settings,
          numBullets: 1,
        }

        const generatedData = await bulletService.generateBullets(payload)

        if (generatedData.length > 0) {
          const [generatedSection] = generatedData
          const [generatedBullet] = generatedSection.bullets

          // If bullet in edit mode, update textarea only
          if (
            editingBullet &&
            editingBullet.section === sectionId &&
            editingBullet.index === index
          ) {
            setEditingBullet((prev) => {
              if (!prev) return null
              return { ...prev, text: generatedBullet.text }
            })
          } else {
            // Else, update bullet in local state
            const sourceData = formData || data
            const updatedBullets = sourceData.bulletPoints.map((bullet) =>
              bullet.id === regeneratingBulletId
                ? { ...bullet, text: generatedBullet.text }
                : bullet
            )
            const updatedProject = {
              ...sourceData,
              bulletPoints: updatedBullets,
            }
            updateProject(updatedProject)
            // Use explicit shouldSave parameter, or default to !formData for backwards compatibility
            const shouldSaveToStorage =
              shouldSave !== undefined ? shouldSave : !formData
            if (shouldSaveToStorage) {
              onSave(
                localData.map((project) =>
                  project.id === sectionId ? updatedProject : project
                )
              )
            }
          }

          validateBulletText(generatedBullet.text)
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

      // Check if this is a new bullet beyond existing bullets
      const isNewBullet = index >= project.bulletPoints.length

      let updatedProject: ProjectBlockData

      if (isNewBullet) {
        // Add new bullet to the array
        const newBullet = {
          id: uuidv4(),
          text: sanitized,
          isLocked: false,
        }
        updatedProject = {
          ...project,
          bulletPoints: [...project.bulletPoints, newBullet],
        }
      } else {
        // Update existing bullet
        updatedProject = {
          ...project,
          bulletPoints: project.bulletPoints.map((bullet, idx) =>
            idx === index ? { ...bullet, text: sanitized } : bullet
          ),
        }
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

    // Check if this is a new bullet that doesn't exist in main state
    const isNewBullet =
      index >= project.bulletPoints.length ||
      (index === project.bulletPoints.length - 1 &&
        project.bulletPoints[index].text === '')

    if (isNewBullet) {
      const updatedProject = {
        ...project,
        bulletPoints: project.bulletPoints.slice(0, -1),
      }
      updateProject(updatedProject)
    }

    setEditingBullet(null)
  }, [editingBullet, findProject, updateProject])

  const handleBulletDelete = useCallback(
    (sectionId: string, index: number, shouldSave: boolean) => {
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

  // TODO: bullets will become self contained and self validating to avoid prop drilling complexity
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
          `Your character target is ${settings.maxCharsPerBullet}. For best results, keep each bullet consistent in length.`,
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
    setExpandedSections(new Set())
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

  // TODO: implement
  const handleAllBulletsRegenerate = () => {}

  const activeItem = useMemo(
    () => localData.find((item) => item.id === activeId),
    [localData, activeId]
  )

  const isAnyBulletBeingEdited = !!editingBullet
  const isAnyBulletRegenerating = !!regeneratingBullet

  const getProjectBlockProps = (project: ProjectBlockData) => {
    const isEditingBullet = editingBullet?.section === project.id
    const editingBulletIndex = isEditingBullet ? editingBullet.index : null

    return {
      data: project,
      keywordData,
      editingBulletIndex,
      isRegenerating: regeneratingBullet?.section === project.id,
      regeneratingBullet,
      editingBulletText: isEditingBullet ? editingBullet.text : '',
      bulletErrors: isEditingBullet ? editingBullet.errors || {} : {},
      onTextareaChange: handleBulletTextUpdate,
      onEditBullet: handleBulletEdit,
      onBulletCancel: handleCancelEdit,
      onAddBullet: (sectionId: string) => handleAddBullet(sectionId, false),
      onBulletSave: () => handleBulletSave(true),
      onBulletDelete: (sectionId: string, index: number) =>
        handleBulletDelete(sectionId, index, true),
      onLockToggle: (sectionId: string, index: number) =>
        handleLockToggle(sectionId, index, true),
    }
  }

  const renderEditableBlock = (
    project: ProjectBlockData,
    existingBlocks: ProjectBlockData[]
  ) => {
    const sharedProps = getProjectBlockProps(project)
    const isNew = project.id === newBlockId
    const showCloseButton = existingBlocks.length > 1 || !isNew

    return (
      <EditableProjectBlock
        {...sharedProps}
        key={project.id}
        isNew={isNew}
        onDelete={handleSectionDelete}
        onClose={showCloseButton ? handleSectionClose : undefined}
        onSave={handleProjectSave}
        onRegenerateBullet={(sectionId, index, formData, shouldSave) =>
          handleBulletRegenerate(sectionId, index, formData, shouldSave)
        }
      />
    )
  }

  const renderDraggableBlock = (
    project: ProjectBlockData,
    isOverlay = false
  ) => {
    const sharedProps = getProjectBlockProps(project)

    if (isOverlay) {
      return (
        <DraggableProjectBlock
          {...sharedProps}
          key={project.id}
          keywordData={null}
          editingBulletIndex={null}
          isRegenerating={false}
          regeneratingBullet={null}
          editingBulletText=''
          bulletErrors={{}}
          isOverlay={true}
          isExpanded={false}
          isDropping={false}
          isAnyBulletBeingEdited={false}
          isAnyBulletRegenerating={false}
          onDrawerToggle={() => {}}
          onBlockSelect={() => {}}
          onRegenerateBullet={() => {}}
          onRegenerateAllBullets={() => {}}
          onLockToggleAll={() => {}}
          onToggleInclude={() => {}}
        />
      )
    }

    return (
      <DraggableProjectBlock
        {...sharedProps}
        key={project.id}
        isDropping={isDropping}
        isExpanded={expandedSections.has(project.id)}
        isAnyBulletBeingEdited={isAnyBulletBeingEdited}
        isAnyBulletRegenerating={isAnyBulletRegenerating}
        onDrawerToggle={() => toggleSectionExpanded(project.id)}
        onBlockSelect={handleSectionSelect}
        onRegenerateBullet={(sectionId, index) =>
          handleBulletRegenerate(sectionId, index)
        }
        onRegenerateAllBullets={handleAllBulletsRegenerate}
        onLockToggleAll={(sectionId, shouldLock) =>
          handleLockToggleAll(sectionId, shouldLock)
        }
        onToggleInclude={(sectionId, isIncluded) =>
          handleSectionInclusion(sectionId, isIncluded)
        }
      />
    )
  }

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your projects...' size='lg' />
      ) : (
        <div className={styles.projects}>
          <h2 className={styles.formTitle}>Projects</h2>
          {!selectedBlockId && localData.length > 0 && (
            <button
              type='button'
              className={styles.addButton}
              disabled={!!selectedBlockId || isAnyBulletRegenerating}
              onClick={handleSectionAdd}
            >
              <FaPlus size={12} />
              Add Project
            </button>
          )}

          <div className={styles.projectsContainer}>
            {selectedBlockId ? (
              localData
                .filter((project) => project.id === selectedBlockId)
                .map((project) => renderEditableBlock(project, localData))
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
                  {localData.map((project) => renderDraggableBlock(project))}
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

export default Projects
