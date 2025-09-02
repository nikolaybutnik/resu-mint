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
              console.log('Auth event: INITIAL_SESSION')
              break
            case 'SIGNED_IN':
              console.log('Auth event: SIGNED_IN')
              break
            case 'SIGNED_OUT':
              console.log('Auth event: SIGNED_OUT')
              break
            case 'TOKEN_REFRESHED':
              console.log('Auth event: TOKEN_REFRESHED')
              break
            case 'USER_UPDATED':
              console.log('Auth event: USER_UPDATED')
              break
            case 'PASSWORD_RECOVERY':
              console.log('Auth event: PASSWORD_RECOVERY')
              break
            case 'MFA_CHALLENGE_VERIFIED':
              console.log('Auth event: MFA_CHALLENGE_VERIFIED')
              break
            default:
              console.log('Auth event: UNKNOWN', event)
          }

          // TODO: handle start services on signup
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
