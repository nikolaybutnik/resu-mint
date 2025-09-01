import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js'
import { experienceManager } from '@/lib/data'

export type AuthResult = Promise<{
  error: { message: string; code?: string } | null
}>

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  hasSyncedExperience: boolean
  signIn: (email: string, password: string) => AuthResult
  signUp: (email: string, password: string) => AuthResult
  signOut: () => AuthResult
  initialize: () => Promise<Subscription | undefined>
}

// TODO: get rid of all manual experience sync logic when eletric sync is in place.

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  hasSyncedExperience: false,

  signIn: async (email: string, password: string): AuthResult => {
    try {
      set({ loading: true })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          error: {
            message: error.message,
            code: error.code,
          },
        }
      }

      set({ user: data.user, session: data.session, loading: false })
      // Kick off one-time post-login sync
      // void syncExperienceOnce()

      return { error: null }
    } catch (error) {
      set({ loading: false })
      console.error('Sign in error: ', error)
      return {
        error: {
          message: 'There was an error signing you in. Please try again later.',
        },
      }
    }
  },

  signUp: async (email: string, password: string): AuthResult => {
    try {
      set({ loading: true })

      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        return { error: { message: error.message, code: error.code } }
      }

      set({ user: data.user, session: data.session, loading: false })
      // Kick off one-time post-signup sync
      // void syncExperienceOnce()

      return { error: null }
    } catch (error) {
      set({ loading: false })
      console.error('Sign up error: ', error)
      return {
        error: {
          message: 'There was an error during sign up. Please try again later.',
        },
      }
    }
  },

  signOut: async (): AuthResult => {
    try {
      set({ loading: true })

      const { error } = await supabase.auth.signOut()

      if (error) {
        return {
          error: {
            message: error.message,
            code: error.code,
          },
        }
      }

      set({
        user: null,
        session: null,
        loading: false,
        hasSyncedExperience: false,
      })
      // Invalidate caches on logout so next read uses local-only path cleanly
      experienceManager.invalidate()

      return { error: null }
    } catch (error) {
      set({ loading: false })
      console.error('Sign out error: ', error)
      return {
        error: {
          message:
            'There was an error signing you out. Please try again later.',
        },
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
        set({ user: session.user, session, loading: false })
        // Run sync once per session
        // void syncExperienceOnce()
      } else {
        set({
          user: null,
          loading: false,
          hasSyncedExperience: false,
        })
        experienceManager.invalidate()
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          if (session?.user) {
            set({ user: session.user, loading: false })
            // void syncExperienceOnce()
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
