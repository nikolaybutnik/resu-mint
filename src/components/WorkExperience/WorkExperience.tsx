import React, { useCallback, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ExperienceBlockData,
  Month,
} from '@/components/EditableExperienceBlock/EditableExperienceBlock'
import EditableExperienceBlock from '@/components/EditableExperienceBlock/EditableExperienceBlock'
import { DraggableExperienceBlock } from '@/components/DraggableExperienceBlock/DraggableExperienceBlock'
import styles from './WorkExperience.module.scss'

interface WorkExperienceProps {
  data: ExperienceBlockData[]
  onSave: (data: ExperienceBlockData[]) => void
}

const WorkExperience: React.FC<WorkExperienceProps> = ({ data, onSave }) => {
  const [localData, setLocalData] = useState<ExperienceBlockData[]>(data)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [newBlockId, setNewBlockId] = useState<string | null>(null)

  useEffect(() => {
    setLocalData(data)
  }, [data])

  const handleBlockDelete = useCallback(
    (id: string) => {
      const updatedData = localData.filter((exp) => exp.id !== id)
      setLocalData(updatedData)
      setSelectedBlockId(null)
      setNewBlockId(null)
      onSave(updatedData)
    },
    [localData, onSave]
  )

  const handleBlockAdd = useCallback(() => {
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
    (updatedBlock: ExperienceBlockData) => {
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
    <div className={styles.workExperience}>
      <h2 className={styles.formTitle}>Work Experience</h2>
      <button
        type='button'
        className={styles.addButton}
        disabled={!!selectedBlockId}
        onClick={handleBlockAdd}
      >
        Add Experience
      </button>
      <div className={styles.experienceContainer}>
        {selectedBlockId
          ? localData
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
          : localData.map((experience) => (
              <DraggableExperienceBlock
                key={experience.id}
                data={experience}
                onBlockSelect={handleBlockSelect}
              />
            ))}
      </div>
    </div>
  )
}

export default WorkExperience
