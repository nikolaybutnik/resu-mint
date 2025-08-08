import { useAuthStore } from '@/stores/authStore'

export function isAuthenticated(): boolean {
  return useAuthStore.getState().user !== null
}

export function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

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

export function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

export const nowIso = (): string => new Date().toISOString()

type LocalEnvelope<T> = { data: T; meta: { updatedAt: string } }

export function readLocalEnvelope<T>(key: string): LocalEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data || !parsed?.meta?.updatedAt) return null
    return parsed
  } catch {
    return null
  }
}

export function writeLocalEnvelope<T>(key: string, data: T, updatedAt: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, meta: { updatedAt } }))
  } catch {}
}
