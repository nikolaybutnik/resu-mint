import { useState, useEffect } from 'react'
import { dataManager } from '../data/dataManager'
import { ExperienceBlockData } from '../types/experience'
import { ExperienceHookResult } from '../types/hooks'

export const useExperience = (): ExperienceHookResult => {
  const [data, setData] = useState<ExperienceBlockData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadExperience = async () => {
      try {
        const experienceData = await dataManager.getExperience()
        setData(experienceData)
      } catch (error) {
        console.error('Error loading experience data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    loadExperience()
  }, [])

  useEffect(() => {
    console.log('useExperience: data state changed to:', data)
  }, [data])

  const save = async (experience: ExperienceBlockData[]) => {
    try {
      await dataManager.saveExperience(experience)
      setData(experience)
    } catch (error) {
      console.error('Error saving experience:', error)
    }
  }

  const refresh = async () => {
    try {
      console.log('useExperience: refresh called')
      setLoading(true)
      dataManager.invalidateExperience()
      const experienceData = await dataManager.getExperience()
      console.log('useExperience: fresh data loaded, triggering update')
      setData(experienceData)
    } catch (error) {
      console.error('Error refreshing experience:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    hasData: data?.length > 0,
    save,
    refresh,
    loading,
  }
}
