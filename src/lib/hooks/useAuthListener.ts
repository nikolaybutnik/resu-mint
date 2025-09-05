import { useEffect, useRef } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore, useDbStore } from '@/stores'
import { toast } from '@/stores/toastStore'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useAuthListener() {
  const initUser = useAuthStore((state) => state.initialize)
  const { startSync, stopSync, startPushSync, stopPushSync } = useDbStore()

  const hasShownLoginToast = useRef(false)
  const lastUserId = useRef<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startAllServices = async (session: Session): Promise<void> => {
    if (!session) return

    await startSync(session)
    startPushSync()
  }

  const stopAllServices = async (): Promise<void> => {
    await stopSync()
    stopPushSync()
  }

  const stopPolling = (): void => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
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
            useAuthStore.setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            })

            if (event === 'SIGNED_OUT') {
              toast.success('You have been signed out successfully.')
            }

            hasShownLoginToast.current = false
            lastUserId.current = null
            await stopAllServices()
            stopPolling()
            return
          }

          if (session?.user) {
            useAuthStore.setState({
              user: session.user,
              session,
              loading: false,
              error: null,
            })
          }

          const dbState = useDbStore.getState()

          switch (event) {
            case 'INITIAL_SESSION':
              hasShownLoginToast.current = true
              lastUserId.current = session.user?.id || null

              if (
                dbState.syncState === 'idle' ||
                dbState.syncState === 'error'
              ) {
                await startAllServices(session)
              }
              break
            case 'SIGNED_IN':
              const currentUserId = session.user?.id
              const isNewLogin =
                !hasShownLoginToast.current ||
                lastUserId.current !== currentUserId

              if (isNewLogin) {
                hasShownLoginToast.current = true
                lastUserId.current = currentUserId || null

                if (session.user?.created_at && session.user?.updated_at) {
                  const createdAt = new Date(session.user.created_at)
                  const now = new Date()

                  const timeSinceCreation =
                    (now.getTime() - createdAt.getTime()) / 1000

                  if (timeSinceCreation <= 10) {
                    toast.success(
                      'Welcome to ResuMint! Your account has been created successfully.'
                    )
                  } else {
                    toast.success('Login successful, welcome back to ResuMint!')
                  }
                } else {
                  toast.success('Login successful, welcome back to ResuMint!')
                }
              }

              if (
                dbState.syncState === 'idle' ||
                dbState.syncState === 'error'
              ) {
                await startAllServices(session)
              }
              break
            case 'TOKEN_REFRESHED':
              if (
                dbState.syncState === 'idle' ||
                dbState.syncState === 'error'
              ) {
                await startAllServices(session)
              }
              break
          }
        } catch (error) {
          console.error('Error handling auth change:', error)
        }
      }
    )

    // Poll every 30s for session validity
    const startPolling = () => {
      if (pollingIntervalRef.current) return

      pollingIntervalRef.current = setInterval(async () => {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          await stopAllServices()
          stopPolling()
          useAuthStore.setState({
            user: null,
            session: null,
            loading: false,
            error: null,
          })
        }
      }, 30_000)
    }

    startPolling()

    return () => {
      subscription.unsubscribe()
      stopPolling()
    }
  }, [
    initUser,
    startSync,
    stopSync,
    startPushSync,
    stopPushSync,
    stopAllServices,
  ])

  // Clean up sync and polling when tab/window closes
  useEffect(() => {
    const handleUnload = () => {
      stopAllServices()
      stopPolling()
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [stopAllServices, stopPolling])

  return null
}
