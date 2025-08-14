'use client'

import Portal from '@/components/shared/Portal/Portal'
import { useConfirmStore } from '@/stores/confirmStore'
import styles from './ConfirmOverlay.module.scss'
import { FaCheck, FaXmark } from 'react-icons/fa6'

const ConfirmOverlay = () => {
  const { open, options, resolve, close } = useConfirmStore()

  const rect = options.anchorEl?.getBoundingClientRect()
  const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
  const top = rect ? rect.top + scrollY : 120
  const left = rect
    ? options.placement === 'left'
      ? rect.left + scrollX
      : rect.right + scrollX - (options.width ?? 240)
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
          width: options.width ?? (rect ? 240 : 320),
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
