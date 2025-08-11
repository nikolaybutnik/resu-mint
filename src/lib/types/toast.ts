export type ToastType = 'success' | 'warning' | 'error'

export interface ToastMessage {
  type: ToastType
  message: string
  durationMs?: number
}
