export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastMessage {
  type: ToastType
  message: string
  durationMs?: number
}
