import { create } from 'zustand'
import type { ToastMessage } from '@/lib/types/toast'
import { v4 as uuidv4 } from 'uuid'

interface ToastState {
  toasts: Array<ToastMessage & { id: string; isExiting?: boolean }>
  show: (toast: ToastMessage) => string
  dismiss: (id: string) => void
  remove: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (toast: ToastMessage) => {
    const id = uuidv4()
    const duration = toast.durationMs ?? 4000
    set((state) => {
      const newToasts = [...state.toasts, { ...toast, id }]
      return { toasts: newToasts.slice(-4) }
    })
    if (duration > 0) {
      window.setTimeout(() => {
        const { dismiss } = get()
        dismiss(id)
      }, duration)
    }
    return id
  },

  dismiss: (id: string) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, isExiting: true } : t
      ),
    }))

    setTimeout(() => {
      const { remove } = get()
      remove(id)
    }, 300)
  },

  remove: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clearAll: () => set({ toasts: [] }),
}))

export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'success', message, durationMs }),
  warning: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'warning', message, durationMs }),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'error', message, durationMs }),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'info', message, durationMs }),
}
