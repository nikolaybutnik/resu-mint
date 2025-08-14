'use client'

import styles from './Toast.module.scss'
import Portal from '@/components/shared/Portal/Portal'
import { useToastStore } from '@/stores/toastStore'
import { IoClose } from 'react-icons/io5'

const Toasts = () => {
  const { toasts, dismiss } = useToastStore()

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓'
      case 'warning':
        return '!'
      case 'error':
        return '✕'
      default:
        return 'i'
    }
  }

  if (toasts.length === 0) return null

  return (
    <Portal>
      <div className={styles.toastContainer}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type]} ${
              t.isExiting ? styles.exiting : ''
            }`}
          >
            <div className={styles.row}>
              <div className={styles.icon}>{getIcon(t.type)}</div>
              <div className={styles.content}>{t.message}</div>
              <button
                type='button'
                className={styles.closeButton}
                onClick={() => dismiss(t.id)}
              >
                <IoClose />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Portal>
  )
}

export default Toasts
