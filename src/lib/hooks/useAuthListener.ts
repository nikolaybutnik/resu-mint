import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore, useDbStore } from '@/stores'
import { AuthChangeEvent, Session, Subscription } from '@supabase/supabase-js'

export function useAuthListener() {
  const initUser = useAuthStore((state) => state.initialize)
  const { startSync, stopSync } = useDbStore()

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
            stopSync()
            return
          }

          // Avoid double-starting sync if already online
          const dbState = useDbStore.getState()
          if (dbState.isOnline) return

          switch (event) {
            case 'INITIAL_SESSION':
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              await startSync(session)
              break
            case 'SIGNED_OUT':
              stopSync()
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
  }, [initUser, startSync, stopSync])

  // Clean up sync when tab/window closes
  useEffect(() => {
    const handleUnload = () => stopSync()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [stopSync])

  return null
}
