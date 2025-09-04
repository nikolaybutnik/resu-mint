import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore, useDbStore } from '@/stores'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

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
    const initAuth = async () => await initUser()
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

          if (session?.user) {
            useAuthStore.setState({
              user: session.user,
              session,
              loading: false,
              error: null,
            })
          } else {
            useAuthStore.setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            })
          }

          const dbState = useDbStore.getState()

          // TODO: handle start services on signup
          switch (event) {
            case 'INITIAL_SESSION':
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              if (
                dbState.syncState === 'idle' ||
                dbState.syncState === 'error'
              ) {
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

    // Poll every 30s for session validity
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        await stopAllServices()
        useAuthStore.setState({
          user: null,
          session: null,
          loading: false,
          error: null,
        })
      }
    }, 30_000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
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
