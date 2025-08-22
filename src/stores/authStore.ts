import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { personalDetailsManager } from '@/lib/data/personalDetailsManager'
import { STORAGE_KEYS } from '@/lib/constants'
import type { PersonalDetails } from '@/lib/types/personalDetails'
import {
  readLocalEnvelope,
  writeLocalEnvelope,
  nowIso,
  getMostRecentTimestamp,
} from '@/lib/data/dataUtils'
import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js'
import { experienceManager } from '@/lib/data'
import { ExperienceBlockData } from '@/lib/types/experience'
import {
  pullExperienceDbRecordToLocal,
  pushExperienceLocalRecordToDb,
} from '@/lib/data/dbUtils'

export type AuthResult = Promise<{
  error: { message: string; code?: string } | null
}>

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  hasSyncedPersonalDetails: boolean
  hasSyncedExperience: boolean
  signIn: (email: string, password: string) => AuthResult
  signUp: (email: string, password: string) => AuthResult
  signOut: () => AuthResult
  initialize: () => Promise<Subscription | undefined>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  hasSyncedPersonalDetails: false,
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
      void syncPersonalDetailsOnce()
      void syncExperienceOnce()

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
      void syncPersonalDetailsOnce()
      void syncExperienceOnce()

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
        hasSyncedPersonalDetails: false,
        hasSyncedExperience: false,
      })
      // Invalidate caches on logout so next read uses local-only path cleanly
      personalDetailsManager.invalidate()
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
        void syncPersonalDetailsOnce()
        void syncExperienceOnce()
      } else {
        set({
          user: null,
          loading: false,
          hasSyncedPersonalDetails: false,
          hasSyncedExperience: false,
        })
        personalDetailsManager.invalidate()
        experienceManager.invalidate()
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
            void syncExperienceOnce()
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

async function syncExperienceOnce(): Promise<void> {
  try {
    const { hasSyncedExperience } = useAuthStore.getState()
    if (hasSyncedExperience) return

    useAuthStore.setState({ hasSyncedExperience: true })

    const localEnv = readLocalEnvelope<ExperienceBlockData[]>(
      STORAGE_KEYS.EXPERIENCE
    )
    const localData = localEnv?.data || []

    const { data: db, error } = await supabase
      .from('experience')
      .select(
        'id, title, company_name, location, description, start_year, start_month, is_present, end_year, end_month, is_included, position, updated_at'
      )

    if (error) {
      return
    }

    if (!db || db.length === 0) {
      if (localData.length > 0) {
        // Push local to DB
        const updatedData: ExperienceBlockData[] = []
        for (const block of localData) {
          const { updatedAt, error } = await pushExperienceLocalRecordToDb(
            block
          )
          if (!error) {
            updatedData.push({ ...block, updatedAt })
          } else {
            // Keep original on error
            updatedData.push(block)
          }
        }
        const mostRecentTimestamp = updatedData
          .map((b) => b.updatedAt || '1970-01-01T00:00:00.000Z')
          .reduce(
            (latest, current) =>
              Date.parse(current) > Date.parse(latest) ? current : latest,
            '1970-01-01T00:00:00.000Z'
          )
        writeLocalEnvelope(
          STORAGE_KEYS.EXPERIENCE,
          updatedData,
          mostRecentTimestamp
        )
        experienceManager.invalidate()
      }
      return
    }

    if (db && !localData.length) {
      // Pull DB to local
      const dbData: ExperienceBlockData[] = await Promise.all(
        db.map((block) => pullExperienceDbRecordToLocal(block))
      )
      const mostRecentTimestamp = getMostRecentTimestamp(dbData)
      writeLocalEnvelope(STORAGE_KEYS.EXPERIENCE, dbData, mostRecentTimestamp)
      experienceManager.invalidate()
      return
    }

    if (db && localData.length) {
      const mergedData: ExperienceBlockData[] = []

      for (const localBlock of localData) {
        const dbBlock = db.find((d) => d.id === localBlock.id)
        if (!dbBlock) {
          // Local-only: Push to DB
          const { updatedAt, error } = await pushExperienceLocalRecordToDb(
            localBlock
          )
          mergedData.push({
            ...localBlock,
            updatedAt: error ? localBlock.updatedAt || nowIso() : updatedAt,
          })
          continue
        }

        // Compare timestamps
        const localTimestamp =
          localBlock.updatedAt || '1970-01-01T00:00:00.000Z'
        const dbTimestamp = dbBlock.updated_at || '1970-01-01T00:00:00.000Z'

        if (Date.parse(localTimestamp) > Date.parse(dbTimestamp)) {
          // Local fresher: Push to DB
          const { updatedAt, error } = await pushExperienceLocalRecordToDb(
            localBlock
          )
          mergedData.push({
            ...localBlock,
            updatedAt: error ? localBlock.updatedAt || nowIso() : updatedAt,
          })
        } else {
          // DB fresher or equal: Pull to local
          const pulledBlock = await pullExperienceDbRecordToLocal(
            dbBlock,
            localBlock.bulletPoints
          )
          mergedData.push(pulledBlock)
        }
      }

      // Write merged data to local envelope
      const mostRecentTimestamp = getMostRecentTimestamp(mergedData)
      writeLocalEnvelope(
        STORAGE_KEYS.EXPERIENCE,
        mergedData,
        mostRecentTimestamp
      )
      experienceManager.invalidate()
    }
  } catch (error) {
    console.error('Experience sync failed:', error)
    // Non-blocking sync, ignore errors
  }
}

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
    if (e.key === STORAGE_KEYS.EXPERIENCE) {
      experienceManager.invalidate()
    }
  })
  storageListenerAttached = true
}
