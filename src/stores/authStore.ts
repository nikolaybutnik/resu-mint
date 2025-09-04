import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import {
  OperationError,
  createAuthError,
  createNetworkError,
  createUnknownError,
  isNetworkError,
} from '@/lib/types/errors'
import { toast } from './toastStore'

export type AuthResult = Promise<{
  error: { message: string; code?: string } | null
}>

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  error: OperationError | null
  signIn: (email: string, password: string) => AuthResult
  signUp: (email: string, password: string) => AuthResult
  signOut: () => AuthResult
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string): AuthResult => {
    try {
      set({ loading: true, error: null })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const operationError = createAuthError(error.message, error)

        toast.error('There was an error signing you in. Please try again.')

        set({ loading: false, error: operationError })
        return {
          error: {
            message: error.message,
            code: error.code,
          },
        }
      }

      set({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      })

      return { error: null }
    } catch (error) {
      const err = error as Error
      console.error('Sign in error:', err)

      const operationError = isNetworkError(err)
        ? createNetworkError('Network error during sign in', err)
        : createUnknownError(
            'There was an error signing you in. Please try again later.',
            err
          )

      toast.error('There was an error signing you in. Please try again.')

      set({ loading: false, error: operationError })

      return {
        error: {
          message: 'An unexpected error occired during sign in.',
        },
      }
    }
  },

  signUp: async (email: string, password: string): AuthResult => {
    try {
      set({ loading: true, error: null })

      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        const operationError = createAuthError(error.message, error)

        toast.error(
          'There was an error during sign up. Please try again later.'
        )

        set({ loading: false, error: operationError })

        return { error: { message: error.message, code: error.code } }
      }

      // TODO: implement email confirmation requirement.
      if (data.user && !data.session) {
        toast.success('Please check your email to confirm your account.')
      }

      set({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      })

      return { error: null }
    } catch (error) {
      const err = error as Error
      console.error('Sign up error:', err)

      const operationError = isNetworkError(err)
        ? createNetworkError('Network error during sign up', err)
        : createUnknownError('Unexpected error during sign up', err)

      toast.error('There was an error during sign up. Please try again later.')

      set({ loading: false, error: operationError })

      return {
        error: {
          message: 'There was an error during sign up. Please try again later.',
        },
      }
    }
  },

  signOut: async (): AuthResult => {
    try {
      set({ loading: true, error: null })

      const { error } = await supabase.auth.signOut()

      if (error) {
        const operationError = createAuthError(error.message, error)

        toast.error(
          'There was an error signing you out. Please try again later.'
        )

        set({ loading: false, error: operationError })

        return {
          error: {
            message: error.message,
            code: error.code,
          },
        }
      }

      set({ loading: false, error: null })

      return { error: null }
    } catch (error) {
      const err = error as Error
      console.error('Sign out error:', err)

      const operationError = isNetworkError(err)
        ? createNetworkError('Network error during sign out', err)
        : createUnknownError('Unexpected error signing you out.', err)

      toast.error('There was an error signing you out. Please try again later.')

      set({ loading: false, error: operationError })

      return {
        error: {
          message:
            'There was an error signing you out. Please try again later.',
        },
      }
    }
  },

  initialize: async (): Promise<void> => {
    try {
      set({ loading: true, error: null })

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        set({
          user: session.user,
          session,
          loading: false,
          error: null,
        })
      } else {
        set({
          user: null,
          session: null,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      const err = error as Error
      console.error('Auth initialization error:', err)

      const operationError = isNetworkError(err)
        ? createNetworkError('Failed to initialize authentication', err)
        : createUnknownError('Failed to initialize authentication', err)

      toast.error('Failed to load your session. Please log in again.')

      set({ user: null, loading: false, error: operationError })
    }
  },
}))

// async function syncExperienceOnce(): Promise<void> {
//   try {
//     const { hasSyncedExperience } = useAuthStore.getState()
//     if (hasSyncedExperience) return

//     useAuthStore.setState({ hasSyncedExperience: true })

//     const localEnv = readLocalEnvelope<ExperienceBlockData[]>(
//       STORAGE_KEYS.EXPERIENCE
//     )
//     const localData = localEnv?.data || []

//     const { data: db, error } = await supabase
//       .from('experience')
//       .select(
//         'id, title, company_name, location, description, start_year, start_month, is_present, end_year, end_month, is_included, position, updated_at'
//       )

//     if (error) {
//       return
//     }

//     if (!db || db.length === 0) {
//       if (localData.length > 0) {
//         // Push local to DB
//         const updatedData: ExperienceBlockData[] = []
//         for (const block of localData) {
//           const { updatedAt, error } = await pushExperienceLocalRecordToDb(
//             block
//           )
//           if (!error) {
//             updatedData.push({ ...block, updatedAt })
//           } else {
//             // Keep original on error
//             updatedData.push(block)
//           }
//         }
//         const mostRecentTimestamp = updatedData
//           .map((b) => b.updatedAt || '1970-01-01T00:00:00.000Z')
//           .reduce(
//             (latest, current) =>
//               Date.parse(current) > Date.parse(latest) ? current : latest,
//             '1970-01-01T00:00:00.000Z'
//           )
//         writeLocalEnvelope(
//           STORAGE_KEYS.EXPERIENCE,
//           updatedData,
//           mostRecentTimestamp
//         )
//         experienceManager.invalidate()
//       }
//       return
//     }

//     if (db && !localData.length) {
//       // Pull DB to local
//       const dbData: ExperienceBlockData[] = await Promise.all(
//         db.map((block) => pullExperienceDbRecordToLocal(block))
//       )
//       const mostRecentTimestamp = getMostRecentTimestamp(dbData)
//       writeLocalEnvelope(STORAGE_KEYS.EXPERIENCE, dbData, mostRecentTimestamp)
//       experienceManager.invalidate()
//       return
//     }

//     if (db && localData.length) {
//       const mergedData: ExperienceBlockData[] = []

//       for (const localBlock of localData) {
//         const dbBlock = db.find((d) => d.id === localBlock.id)
//         if (!dbBlock) {
//           // Local-only: Push to DB
//           const { updatedAt, error } = await pushExperienceLocalRecordToDb(
//             localBlock
//           )
//           mergedData.push({
//             ...localBlock,
//             updatedAt: error ? localBlock.updatedAt || nowIso() : updatedAt,
//           })
//           continue
//         }

//         // Compare timestamps
//         const localTimestamp =
//           localBlock.updatedAt || '1970-01-01T00:00:00.000Z'
//         const dbTimestamp = dbBlock.updated_at || '1970-01-01T00:00:00.000Z'

//         if (Date.parse(localTimestamp) > Date.parse(dbTimestamp)) {
//           // Local fresher: Push to DB
//           const { updatedAt, error } = await pushExperienceLocalRecordToDb(
//             localBlock
//           )
//           mergedData.push({
//             ...localBlock,
//             updatedAt: error ? localBlock.updatedAt || nowIso() : updatedAt,
//           })
//         } else {
//           // DB fresher or equal: Pull to local
//           const pulledBlock = await pullExperienceDbRecordToLocal(
//             dbBlock,
//             localBlock.bulletPoints
//           )
//           mergedData.push(pulledBlock)
//         }
//       }

//       // Write merged data to local envelope
//       const mostRecentTimestamp = getMostRecentTimestamp(mergedData)
//       writeLocalEnvelope(
//         STORAGE_KEYS.EXPERIENCE,
//         mergedData,
//         mostRecentTimestamp
//       )
//       experienceManager.invalidate()
//     }
//   } catch (error) {
//     console.error('Experience sync failed:', error)
//     // Non-blocking sync, ignore errors
//   }
// }
