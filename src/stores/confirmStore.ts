import { create } from 'zustand'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  anchorEl?: HTMLElement | null
  placement?: 'left' | 'right'
  width?: number
}

type ConfirmState = {
  open: boolean
  options: ConfirmOptions
  resolver: null | ((v: boolean) => void)
  show: (opts: ConfirmOptions) => Promise<boolean>
  resolve: (result: boolean) => void
  close: () => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: { message: '' },
  resolver: null,

  show: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        options: { ...opts },
        resolver: resolve,
      })
    }),

  resolve: (result) => {
    const resolver = get().resolver
    resolver?.(result)
    set({ open: false, resolver: null })
  },

  close: () => {
    const resolver = get().resolver
    resolver?.(false)
    set({ open: false, resolver: null })
  },
}))

export const confirm = (opts: ConfirmOptions) =>
  useConfirmStore.getState().show(opts)
