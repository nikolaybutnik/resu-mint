import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore, useDbStore } from '@/stores'
import { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'

export function useAuthListener() {
  const initUser = useAuthStore((state) => state.initialize)
  const { startSync, stopSync, startPushSync, stopPushSync } = useDbStore()

  const startAllServices = async (session: Session) => {
    await startSync(session)
    startPushSync()
  }

  const stopAllServices = async () => {
    await stopSync()
    stopPushSync()
  }

  useEffect(() => {
    let authSubscription: Subscription | null = null

    const initAuth = async () => {
      authSubscription = (await initUser()) || null
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        try {
          if (!session) {
            await stopAllServices()
            return
          }

          const dbState = useDbStore.getState()

          switch (event) {
            case 'INITIAL_SESSION':
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              if (!dbState.isOnline) {
                await startAllServices(session)
              }
              break
            case 'SIGNED_OUT':
              await stopAllServices()
              break
          }
        } catch (error) {
          console.error('Error handling auth change:', error)
        }
      }
    )

    return () => {
      if (authSubscription) authSubscription.unsubscribe()
      subscription.unsubscribe()
    }
  }, [initUser, startSync, stopSync, startPushSync, stopPushSync])

  // Clean up sync when tab/window closes
  useEffect(() => {
    const handleUnload = () => stopAllServices()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [stopAllServices])

  return null
}
