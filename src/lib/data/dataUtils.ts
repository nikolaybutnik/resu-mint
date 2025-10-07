import { useAuthStore } from '@/stores/authStore'
import { ProjectBlockData } from '../types/projects'
import { ExperienceBlockData } from '../types/experience'

export function isAuthenticated(): boolean {
  return useAuthStore.getState().user !== null
}

export function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

// TODO: remove when db migration is completed
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

export function waitForAuthReady(): Promise<void> {
  return new Promise((resolve) => {
    if (!useAuthStore.getState().loading) return resolve()

    const unsubscribe = useAuthStore.subscribe(
      (state: { loading: boolean }) => {
        if (!state.loading) {
          unsubscribe()
          resolve()
        }
      }
    )
  })
}

export const nowIso = (): string => new Date().toISOString()

export const getMostRecentTimestamp = (
  data: ProjectBlockData[] | ExperienceBlockData[]
) => {
  return data
    .map((b) => b.updatedAt || '1970-01-01T00:00:00.000Z')
    .reduce(
      (latest, current) =>
        Date.parse(current) > Date.parse(latest) ? current : latest,
      '1970-01-01T00:00:00.000Z'
    )
}
