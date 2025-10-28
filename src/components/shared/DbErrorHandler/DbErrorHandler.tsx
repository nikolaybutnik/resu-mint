'use client'

import { useEffect } from 'react'
import { useDbStore } from '@/stores'
import { toast } from '@/stores/toastStore'

/**
 * DbErrorHandler - Monitors dbStore for errors and displays appropriate toast messages
 */
export const DbErrorHandler: React.FC = () => {
  const { error: dbError, clearError } = useDbStore()

  useEffect(() => {
    if (dbError) {
      switch (dbError.code) {
        case 'SCHEMA_ERROR':
          toast.error('Database setup failed. Please refresh the page.')
          break
        case 'QUOTA_EXCEEDED':
          toast.error('Storage space is full. Please clear your browser cache.')
          break
        case 'NETWORK_ERROR':
          if (dbError.message.includes('Failed to start sync')) {
            toast.error('Failed to start data synchronization.')
          } else if (dbError.message.includes('Sync stream error')) {
            toast.error(
              'There was an unexpected error while synchronizing your data with the cloud.'
            )
          } else if (dbError.message.includes('Push sync network error')) {
            // Silent on push sync network errors
            console.warn('Push sync network error:', dbError.message)
          } else {
            toast.error(
              'Network connection failed. Please check your internet connection.'
            )
          }
          break
        case 'AUTH_ERROR':
          // Silent - auth state changes are handled by useAuthListener
          console.warn('Auth error detected:', dbError.message)
          break
        case 'STORAGE_ERROR':
          if (dbError.message.includes('Database initialization failed')) {
            toast.error(
              'Failed to initialize local database. Please refresh the page.'
            )
          } else if (dbError.message.includes('Database not available')) {
            toast.error('Database is not available. Please refresh the page.')
          } else if (dbError.message.includes('close database connection')) {
            toast.error('Failed to close database properly.')
          } else {
            toast.error(
              'A storage error occurred. Please try refreshing the page.'
            )
          }
          break
        case 'VALIDATION_ERROR':
          toast.error('Invalid configuration. Please contact support.')
          break
        case 'UNKNOWN_ERROR':
          if (dbError.message.includes('Sync initialization failed')) {
            toast.error('Failed to start data synchronization.')
          } else if (dbError.message.includes('Sync stream error')) {
            toast.error(
              'There was an unexpected error while synchronizing your data.'
            )
          } else if (dbError.message.includes('Push sync failed')) {
            // Silent on push sync failures
            console.warn('Push sync failed:', dbError.message)
          } else {
            toast.error('An unexpected error occurred. Please try again.')
          }
          break
        default:
          toast.error('An unexpected error occurred. Please try again.')
      }
      clearError()
    }
  }, [dbError, clearError])

  return null
}
