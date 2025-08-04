import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js'

interface AuthStore {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  initialize: () => Promise<Subscription | undefined>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  signIn: async (
    email: string,
    password: string
  ): Promise<{
    error: string | null
  }> => {
    try {
      set({ loading: true })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      set({ user: data.user, loading: false })

      return { error: null }
    } catch (error) {
      set({ loading: false })
      console.error('Sign in error: ', error)
      return {
        error: 'There was an error signing you in. Please try again later.',
      }
    }
  },

  signUp: async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    try {
      set({ loading: true })

      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        return { error: error.message }
      }

      set({ user: data.user, loading: false })

      return { error: null }
    } catch (error) {
      set({ loading: false })
      console.error('Sign up error: ', error)
      return {
        error: 'There was an error during sign up. Please try again later.',
      }
    }
  },

  signOut: async (): Promise<{ error: string | null }> => {
    try {
      set({ loading: true })

      const { error } = await supabase.auth.signOut()

      if (error) {
        return { error: error.message }
      }

      set({ user: null, loading: false })

      return { error: null }
    } catch (error) {
      set({ loading: false })
      console.error('Sign out error: ', error)
      return {
        error: 'There was an error signing you out. Please try again later.',
      }
    }
  },

  initialize: async (): Promise<Subscription | undefined> => {
    try {
      set({ loading: true })

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        set({ user: session.user, loading: false })
      } else {
        set({ user: null, loading: false })
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          console.info('Auth state changed: ', event, session?.user?.id)

          if (session?.user) {
            set({ user: session.user, loading: false })
          } else {
            set({ user: null, loading: false })
          }
        }
      )

      return subscription
    } catch (error) {
      set({ user: null, loading: false })
      console.error('Auth initialization error: ', error)
    }
  },
}))
