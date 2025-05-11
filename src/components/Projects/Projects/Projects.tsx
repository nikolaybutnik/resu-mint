import styles from './Projects.module.scss'
import { useState, useEffect, useCallback } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner'
import { v4 as uuidv4 } from 'uuid'
import { Month } from '@/components/Experience/EditableExperienceBlock/EditableExperienceBlock'
import { ProjectBlockData } from '../EditableProjectBlock/EditableProjectBlock'
import EditableProjectBlock from '../EditableProjectBlock/EditableProjectBlock'
import { DraggableProjectBlock } from '../DraggableProjectBlock/DraggableProjectBlock'

interface ProjectsProps {
  data: ProjectBlockData[]
  loading: boolean
  onSave: (data: ProjectBlockData[]) => void
}

const Projects = ({ data, loading, onSave }: ProjectsProps) => {
  const [localData, setLocalData] = useState<ProjectBlockData[]>(data)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [newBlockId, setNewBlockId] = useState<string | null>(null)

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
            {selectedBlockId
              ? localData
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
              : localData.map((project) => (
                  <DraggableProjectBlock
                    key={project.id}
                    data={project}
                    onBlockSelect={handleBlockSelect}
                  />
                ))}
          </div>
        </div>
      )}
    </>
  )
}

export default Projects
