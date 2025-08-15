'use client'

import Portal from '@/components/shared/Portal/Portal'
import { useConfirmStore } from '@/stores/confirmStore'
import styles from './ConfirmOverlay.module.scss'
import { FaCheck, FaXmark } from 'react-icons/fa6'

const clampToScreen = (elWidth: number, initPosition: number): number => {
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024 // fallback for SSR
  if (elWidth + 32 >= windowWidth) return 0

  if (initPosition <= 16) {
    return 16
  } else if (initPosition + elWidth > windowWidth) {
    return windowWidth - elWidth - 16
  } else return initPosition
}

const ConfirmOverlay = () => {
  const { open, options, resolve, close } = useConfirmStore()

  const popupWidth = Math.min(
    options.width ?? 240,
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const rect = options.anchorEl?.getBoundingClientRect()
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
  const top = rect ? rect.top + scrollY : 120
  const left = rect
    ? options.placement === 'left'
      ? clampToScreen(popupWidth, rect.left + scrollX)
      : clampToScreen(popupWidth, rect.right + scrollX - popupWidth)
    : undefined

  if (!open) return null

  return (
    <Portal>
      <div className={styles.overlayBackdrop} onClick={() => close()} />
      <div
        className={styles.modal}
        style={{
          top,
          left,
          width: popupWidth,
          position: rect ? ('absolute' as const) : ('fixed' as const),
        }}
      >
        {options.title && <h4 className={styles.title}>{options.title}</h4>}
        <p className={styles.message}>{options.message}</p>
        <div className={styles.actions}>
          <button
            title='Cancel'
            className={
              options.cancelText && options.cancelText.trim()
                ? styles.cancelActionButton
                : styles.cancelIconButton
            }
            onClick={() => close()}
          >
            {options.cancelText ?? ''}
            {!(options.cancelText && options.cancelText.trim()) && (
              <FaXmark size={12} />
            )}
          </button>
          <button
            title='Confirm'
            className={
              options.confirmText && options.confirmText.trim()
                ? styles.confirmActionButton
                : styles.confirmIconButton
            }
            onClick={() => resolve(true)}
          >
            {options.confirmText ?? ''}
            {!(options.confirmText && options.confirmText.trim()) && (
              <FaCheck size={12} />
            )}
          </button>
        </div>
      </div>
    </Portal>
  )
}

export default ConfirmOverlay
