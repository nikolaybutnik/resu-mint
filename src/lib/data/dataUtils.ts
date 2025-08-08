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

    let unsub: () => void
    const listener = (state: { loading: boolean }) => {
      if (!state.loading) {
        unsub()
        resolve()
      }
    }
    unsub = useAuthStore.subscribe(listener)
  })
}

export function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}
