import React, { useCallback, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  experienceBlockSchema,
  ExperienceBlockData,
  Month,
} from '@/components/ExperienceBlock/ExperienceBlock'
import ExperienceBlock from '@/components/ExperienceBlock/ExperienceBlock'
import styles from './WorkExperience.module.scss'

interface WorkExperienceProps {
  data: ExperienceBlockData[]
  onUpdate: (data: ExperienceBlockData[]) => void
  onSave: ({
    data,
    isValid,
  }: {
    data: ExperienceBlockData[]
    isValid: boolean
  }) => void
}

const WorkExperience: React.FC<WorkExperienceProps> = ({
  data,
  onUpdate,
  onSave,
}) => {
  const [validityMap, setValidityMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const initialValidityMap = data.reduce((map, block) => {
      map[block.id] = experienceBlockSchema.safeParse(block).success
      return map
    }, {} as Record<string, boolean>)
    setValidityMap(initialValidityMap)
  }, [data])

  const isValid =
    Object.keys(validityMap).length === 0 ||
    Object.values(validityMap).every((valid) => valid)

  const handleBlockUpdate = useCallback(
    (id: string, blockData: ExperienceBlockData, isValid: boolean) => {
      const updatedData = data.map((exp) => (exp.id === id ? blockData : exp))
      setValidityMap((prev) => ({ ...prev, [id]: isValid }))
      onUpdate(updatedData)
    },
    [data, onUpdate]
  )

  const handleBlockDelete = useCallback(
    (id: string) => {
      const updatedData = data.filter((exp) => exp.id !== id)
      setValidityMap((prev) => {
        const newMap = { ...prev }
        delete newMap[id]
        return newMap
      })
      onUpdate(updatedData)
    },
    [data, onUpdate]
  )

  const handleBlockAdd = useCallback(() => {
    const newBlock: ExperienceBlockData = {
      id: uuidv4(),
      jobTitle: '',
      startDate: { month: 'Jan' as Month, year: '' },
      endDate: { month: '' as Month, year: '', isPresent: false },
      companyName: '',
      location: '',
      bulletPoints: [],
    }
    const updatedData = [...data, newBlock]
    setValidityMap((prev) => ({ ...prev, [newBlock.id]: false }))
    onUpdate(updatedData)
  }, [data, onUpdate])

  const handleSave = useCallback(() => {
    const validBlocks = data.filter(
      (block) => experienceBlockSchema.safeParse(block).success
    )
    onSave({ data: validBlocks, isValid })
  }, [data, isValid, onSave])

  return (
    <div className={styles.workExperience}>
      <h2>Work Experience</h2>
      <button
        type='button'
        className={styles.addButton}
        onClick={handleBlockAdd}
      >
        Add Experience
      </button>
      {data.map((experience) => (
        <ExperienceBlock
          key={experience.id}
          id={experience.id}
          data={experience}
          onBlockUpdate={handleBlockUpdate}
          onDelete={handleBlockDelete}
        />
      ))}
      <button
        type='button'
        className={styles.saveButton}
        onClick={handleSave}
        disabled={!isValid}
      >
        Save Work Experience
      </button>
    </div>
  )
}

export default WorkExperience
