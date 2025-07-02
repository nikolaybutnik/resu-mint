import { use } from 'react'
import { dataManager } from '../data/dataManager'
import { PersonalDetails } from '../types/personalDetails'
import { PersonalDetailsHookResult } from '../types/hooks'

export const usePersonalDetails = (): PersonalDetailsHookResult => {
  const data = use(dataManager.getPersonalDetails())

  return {
    data,
    hasData: !!data?.name?.trim() && !!data?.email?.trim(),
    save: (details: PersonalDetails) =>
      dataManager.savePersonalDetails(details),
    refresh: () => dataManager.invalidatePersonalDetails(),
  }
}
