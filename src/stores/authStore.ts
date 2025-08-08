import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { personalDetailsManager } from '@/lib/data/personalDetailsManager'
import { STORAGE_KEYS } from '@/lib/constants'
import type { PersonalDetails } from '@/lib/types/personalDetails'
import {
  readLocalEnvelope,
  writeLocalEnvelope,
  nowIso,
} from '@/lib/data/dataUtils'
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js'

interface AuthStore {
  user: User | null
  loading: boolean
  hasSyncedPersonalDetails: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
  initialize: () => Promise<Subscription | undefined>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  hasSyncedPersonalDetails: false,

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
      // Kick off one-time post-login sync
      void syncPersonalDetailsOnce()

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
      // Kick off one-time post-signup sync
      void syncPersonalDetailsOnce()

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

      set({ user: null, loading: false, hasSyncedPersonalDetails: false })
      // Invalidate caches on logout so next read uses local-only path cleanly
      personalDetailsManager.invalidate()

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
        // Run sync once per session
        void syncPersonalDetailsOnce()
      } else {
        set({ user: null, loading: false, hasSyncedPersonalDetails: false })
        personalDetailsManager.invalidate()
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          console.info(
            `Auth event: ${event} - User: ${
              session?.user ? 'Found' : 'None'
            } - ID: ${session?.user?.id || 'N/A'}`
          )

          if (session?.user) {
            set({ user: session.user, loading: false })
            void syncPersonalDetailsOnce()
          } else {
            set({ user: null, loading: false })
          }
        }
      )

      // Attach cross-tab listener once per app lifecycle
      if (typeof window !== 'undefined') {
        setupStorageListener()
      }

      return subscription
    } catch (error) {
      set({ user: null, loading: false })
      console.error('Auth initialization error: ', error)
    }
  },
}))

// One-time per session: reconcile personal_details between local envelope and DB
async function syncPersonalDetailsOnce(): Promise<void> {
  try {
    const { hasSyncedPersonalDetails } = useAuthStore.getState()
    if (hasSyncedPersonalDetails) return

    // Mark as syncing to avoid races
    useAuthStore.setState({ hasSyncedPersonalDetails: true })

    const localEnv = readLocalEnvelope<PersonalDetails>(
      STORAGE_KEYS.PERSONAL_DETAILS
    )
    const localData = localEnv?.data
    const localUpdatedAt =
      localEnv?.meta?.updatedAt ?? '1970-01-01T00:00:00.000Z'

    const { data: db, error } = await supabase
      .from('personal_details')
      .select(
        'name, email, phone, location, linkedin, github, website, updated_at'
      )
      .maybeSingle()

    if (error) return

    if (!db && localData) {
      // Push local => DB
      await supabase.rpc('upsert_personal_details', {
        p_name: localData.name,
        p_email: localData.email,
        p_phone: localData.phone ?? '',
        p_location: localData.location ?? '',
        p_linkedin: localData.linkedin ?? '',
        p_github: localData.github ?? '',
        p_website: localData.website ?? '',
      })
      writeLocalEnvelope(STORAGE_KEYS.PERSONAL_DETAILS, localData, nowIso())
      personalDetailsManager.invalidate()
      return
    }

    if (db && !localData) {
      // Pull DB => local
      const dbData: PersonalDetails = {
        name: db.name ?? '',
        email: db.email ?? '',
        phone: db.phone ?? '',
        location: db.location ?? '',
        linkedin: db.linkedin ?? '',
        github: db.github ?? '',
        website: db.website ?? '',
      }
      writeLocalEnvelope(
        STORAGE_KEYS.PERSONAL_DETAILS,
        dbData,
        db.updated_at ?? nowIso()
      )
      personalDetailsManager.invalidate()
      return
    }

    if (db && localData) {
      const dbUpdatedAt = db.updated_at ?? '1970-01-01T00:00:00.000Z'
      if (Date.parse(localUpdatedAt) > Date.parse(dbUpdatedAt)) {
        // Local newer => push to DB
        await supabase.rpc('upsert_personal_details', {
          p_name: localData.name,
          p_email: localData.email,
          p_phone: localData.phone ?? '',
          p_location: localData.location ?? '',
          p_linkedin: localData.linkedin ?? '',
          p_github: localData.github ?? '',
          p_website: localData.website ?? '',
        })
        writeLocalEnvelope(STORAGE_KEYS.PERSONAL_DETAILS, localData, nowIso())
      } else {
        // DB newer => overwrite local
        const dbData: PersonalDetails = {
          name: db.name ?? '',
          email: db.email ?? '',
          phone: db.phone ?? '',
          location: db.location ?? '',
          linkedin: db.linkedin ?? '',
          github: db.github ?? '',
          website: db.website ?? '',
        }
        writeLocalEnvelope(
          STORAGE_KEYS.PERSONAL_DETAILS,
          dbData,
          db.updated_at ?? nowIso()
        )
      }
      personalDetailsManager.invalidate()
    }
  } catch (error) {
    console.error('Db sync failed: ', error)
    // Non-blocking sync, ignore errors
  }
}

// Cross-tab: invalidate caches when localStorage changes in other tabs
let storageListenerAttached = false
function setupStorageListener() {
  if (storageListenerAttached) return
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.PERSONAL_DETAILS) {
      personalDetailsManager.invalidate()
    }
  })
  storageListenerAttached = true
}
