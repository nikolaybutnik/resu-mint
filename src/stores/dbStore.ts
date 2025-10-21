import { create } from 'zustand'
import { PGlite } from '@electric-sql/pglite'
import {
  electricSync,
  SyncShapeToTableOptions,
  SyncShapeToTableResult,
  SyncShapesToTablesOptions,
  SyncShapesToTablesResult,
} from '@electric-sql/pglite-sync'
import {
  Row,
  ShapeStreamInterface,
  Message,
  isChangeMessage,
} from '@electric-sql/client'
import { API_ROUTES, DEFAULT_STATE_VALUES } from '@/lib/constants'
import { PersonalDetails } from '@/lib/types/personalDetails'
import { ExperienceBlockData } from '@/lib/types/experience'
import { Session } from '@supabase/supabase-js'
import {
  initializeEducationChangelogQuery,
  initializeEducationQuery,
  initializeExperienceBulletsQuery,
  initializeExperienceChangelogQuery,
  initializeExperienceQuery,
  initializePersonalDetailsChangelogQuery,
  initializePersonalDetailsQuery,
  initializeProjectBulletsQuery,
  initializeProjectChangelogQuery,
  initializeProjectsQuery,
  initializeResumeSkillsChangelogQuery,
  initializeResumeSkillsQuery,
  initializeSettingsChangelogQuery,
  initializeSettingsQuery,
  initializeSkillsChangelogQuery,
  initializeSkillsQuery,
} from '@/lib/sql'
import { pushLocalChangesToRemote } from '@/lib/dbUtils'
import {
  usePersonalDetailsStore,
  useExperienceStore,
  useAuthStore,
  useProjectStore,
  useEducationStore,
  useSettingsStore,
  useSkillsStore,
} from './'
import { toast } from './toastStore'
import {
  OperationError,
  createAuthError,
  createNetworkError,
  createQuotaExceededError,
  createSchemaError,
  createStorageError,
  createUnknownError,
  createValidationError,
  isNetworkError,
  isQuotaExceededError,
} from '@/lib/types/errors'
import { ProjectBlockData } from '@/lib/types/projects'
import { debounce } from 'lodash'
import { EducationBlockData } from '@/lib/types/education'
import { AppSettings } from '@/lib/types/settings'
import { SkillBlock, Skills } from '@/lib/types/skills'

export type ElectricDb = PGlite & {
  electric: {
    initMetadataTables: () => Promise<void>
    syncShapesToTables: (
      options: SyncShapesToTablesOptions
    ) => Promise<SyncShapesToTablesResult>
    syncShapeToTable: (
      options: SyncShapeToTableOptions
    ) => Promise<SyncShapeToTableResult>
    deleteSubscription: (key: string) => Promise<void>
  }
}

interface TableSyncConfig {
  table: string
  columns: string[]
  primaryKey: string[]
  shapeKey: string
}

interface DbStore {
  db: ElectricDb | null
  initializing: boolean
  syncState: 'idle' | 'connecting' | 'syncing' | 'error' | 'offline'
  activeStreams: Map<string, SyncShapeToTableResult>
  tableConfigs: Map<string, TableSyncConfig>
  pushSyncTimer: NodeJS.Timeout | null
  error: OperationError | null
  initialize: () => Promise<void>
  startSync: (session: Session, tableNames?: string[]) => Promise<void>
  stopSync: () => Promise<void>
  registerTable: (config: TableSyncConfig) => void
  getStream: (tableName: string) => ShapeStreamInterface<Row<unknown>> | null
  close: () => void
  startPushSync: (intervalMs?: number) => void
  stopPushSync: () => void
}

const TABLE_CONFIGS: Record<string, TableSyncConfig> = {
  personal_details: {
    table: 'personal_details',
    columns: [
      'id',
      'name',
      'email',
      'phone',
      'location',
      'linkedin',
      'github',
      'website',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'personal_details',
  },
  experience: {
    table: 'experience',
    columns: [
      'id',
      'title',
      'company_name',
      'location',
      'description',
      'start_month',
      'start_year',
      'end_month',
      'end_year',
      'is_present',
      'is_included',
      'position',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'experience',
  },
  experience_bullets: {
    table: 'experience_bullets',
    columns: [
      'id',
      'experience_id',
      'text',
      'is_locked',
      'position',
      'user_id',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'experience_bullets',
  },
  projects: {
    table: 'projects',
    columns: [
      'id',
      'title',
      'link',
      'technologies',
      'description',
      'start_month',
      'start_year',
      'end_month',
      'end_year',
      'is_present',
      'is_included',
      'position',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'projects',
  },
  project_bullets: {
    table: 'project_bullets',
    columns: [
      'id',
      'project_id',
      'text',
      'is_locked',
      'position',
      'user_id',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'project_bullets',
  },
  education: {
    table: 'education',
    columns: [
      'id',
      'institution',
      'degree',
      'degree_status',
      'location',
      'description',
      'start_month',
      'start_year',
      'end_month',
      'end_year',
      'is_included',
      'position',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'education',
  },
  settings: {
    table: 'app_settings',
    columns: [
      'id',
      'bullets_per_experience_block',
      'bullets_per_project_block',
      'max_chars_per_bullet',
      'language_model',
      'section_order',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'app_settings',
  },
  skills: {
    table: 'skills',
    columns: [
      'id',
      'hard_skills',
      'hard_suggestions',
      'soft_skills',
      'soft_suggestions',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'skills',
  },
  resume_skills: {
    table: 'resume_skills',
    columns: [
      'id',
      'title',
      'skills',
      'is_included',
      'position',
      'updated_at',
      'created_at',
    ],
    primaryKey: ['id'],
    shapeKey: 'resume_skills',
  },
}

// TODO: handle errors upstream

const TABLE_STORE_RESET_MAP = {
  personal_details: (defaultValue: PersonalDetails) =>
    usePersonalDetailsStore.setState({ data: defaultValue }),
  experience: (defaultValue: ExperienceBlockData[]) =>
    useExperienceStore.setState({ data: defaultValue }),
  experience_bullets: () => {
    const { refresh } = useExperienceStore.getState()
    refresh()
  },
  projects: (defaultValue: ProjectBlockData[]) =>
    useProjectStore.setState({ data: defaultValue }),
  project_bullets: () => {
    const { refresh } = useProjectStore.getState()
    refresh()
  },
  education: (defaultValue: EducationBlockData[]) =>
    useEducationStore.setState({ data: defaultValue }),
  settings: (defaultValue: AppSettings) =>
    useSettingsStore.setState({ data: defaultValue }),
  skills: (defaultValue: Skills) =>
    useSkillsStore.setState({ skillsData: defaultValue }),
  resume_skills: (defaultValue: SkillBlock[]) =>
    useSkillsStore.setState({ resumeSkillsData: defaultValue }),
} as const

let firstSyncFlag = true

const initializeTables = async (db: PGlite) => {
  try {
    await db.query(initializePersonalDetailsQuery)
    await db.query(initializePersonalDetailsChangelogQuery)
    await db.query(initializeExperienceQuery)
    await db.query(initializeExperienceBulletsQuery)
    await db.query(initializeExperienceChangelogQuery)
    await db.query(initializeProjectsQuery)
    await db.query(initializeProjectBulletsQuery)
    await db.query(initializeProjectChangelogQuery)
    await db.query(initializeEducationQuery)
    await db.query(initializeEducationChangelogQuery)
    await db.query(initializeSettingsQuery)
    await db.query(initializeSettingsChangelogQuery)
    await db.query(initializeSkillsQuery)
    await db.query(initializeSkillsChangelogQuery)
    await db.query(initializeResumeSkillsQuery)
    await db.query(initializeResumeSkillsChangelogQuery)
  } catch (error) {
    toast.error('Failed to initialize DB tables')
  }
}

export const useDbStore = create<DbStore>((set, get) => ({
  db: null,
  initializing: false,
  syncState: 'idle',
  activeStreams: new Map(),
  tableConfigs: new Map(Object.entries(TABLE_CONFIGS)),
  pushSyncTimer: null,
  error: null,

  initialize: async () => {
    set({ initializing: true, error: null })

    try {
      const db = (await PGlite.create('idb://resumint-local', {
        extensions: { electric: electricSync() },
      })) as ElectricDb

      await initializeTables(db)

      set({ db, initializing: false })

      const session = useAuthStore.getState().session

      if (session) {
        // 1. Push local changes first
        await pushLocalChangesToRemote()

        // 2. Start downstream sync
        await get().startSync(session)

        // 3. Start recurring push sync for future changes
        get().startPushSync()
      }
    } catch (error) {
      const err = error as Error

      if (
        err.message?.includes('already exists') ||
        err.message?.includes('does not exist') ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('violates')
      ) {
        try {
          toast.warning('Schema conflict detected, attempting recovery...')
          await PGlite.create('idb://resumint-local', {
            extensions: { electric: electricSync() },
          })
          // Retry init once
          return await get().initialize()
        } catch (retryError) {
          toast.error(
            'Database setup failed. Please refresh the page to try again.'
          )
          set({
            initializing: false,
            syncState: 'error',
            error: createSchemaError(
              'Failed to recover from schema conflict',
              retryError
            ),
          })
          return
        }
      }

      if (isQuotaExceededError(err)) {
        toast.error(
          'Storage space is full. Please free up space in your browser or clear old data.'
        )
        set({
          initializing: false,
          syncState: 'error',
          error: createQuotaExceededError(err),
        })
        return
      }

      if (isNetworkError(err)) {
        set({
          initializing: false,
          syncState: 'error',
          error: createNetworkError(
            'Network error while initializing database',
            err
          ),
        })
        return
      }

      toast.error(
        'Failed to initialize local database. Please refresh the page.'
      )
      set({
        initializing: false,
        syncState: 'error',
        error: createStorageError('Database initialization failed', err),
      })
    }
  },

  registerTable: (config: TableSyncConfig) => {
    try {
      if (
        !config.table ||
        !config.primaryKey?.length ||
        !config.columns?.length
      ) {
        set({
          error: createValidationError(
            'Invalid table configuration: missing required fields'
          ),
        })
        return
      }

      set((state) => ({
        tableConfigs: new Map(state.tableConfigs).set(config.table, config),
        error: null,
      }))
    } catch (error) {
      const err = error as Error
      set({
        error: createValidationError('Failed to register table', err),
      })
    }
  },

  startSync: async (session: Session, tableNames?: string[]) => {
    const { db, activeStreams, tableConfigs } = get()
    const { refresh: refreshPersonalDetails } =
      usePersonalDetailsStore.getState()
    const { refresh: refreshExperience } = useExperienceStore.getState()
    const { refresh: refreshProjects } = useProjectStore.getState()
    const { refresh: refreshEducation } = useEducationStore.getState()
    const { refresh: refreshSettings } = useSettingsStore.getState()
    const { refresh: refreshSkills } = useSkillsStore.getState()

    if (!db) {
      set({
        error: createStorageError('Database not initialized'),
      })
      return
    }

    set({ syncState: 'connecting', error: null })

    try {
      await db.electric.initMetadataTables()

      const syncPhases = [
        // Phase 1: Independent tables
        [
          'personal_details',
          'education',
          'settings',
          'skills',
          'resume_skills',
        ],
        // Phase 2: Parent tables
        ['experience', 'projects'],
        // Phase 3: Child tables
        ['experience_bullets', 'project_bullets'],
      ]

      let completedPhases = 0

      for (const phase of syncPhases) {
        if (tableNames) {
          // If specific table names provided, sync them directly
          for (const tableName of tableNames) {
            await syncTable(tableName)
          }
          break
        } else {
          // Otherwise sync by phases
          await Promise.all(phase.map((tableName) => syncTable(tableName)))
          completedPhases++

          // Delay to ensure previous phase sync has settled
          if (completedPhases < syncPhases.length) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }
      }

      async function syncTable(tableName: string) {
        const config = tableConfigs.get(tableName)
        if (!config) {
          toast.warning(`No config found for table: ${tableName}`)
          return
        }

        if (activeStreams.has(tableName)) {
          return
        }

        if (!db) {
          toast.error('Database not initialized')
          return
        }

        const syncResult = await db.electric.syncShapeToTable({
          shape: {
            url: `${window.location.origin}${API_ROUTES.SHAPE_PROXY}`,
            params: {
              table: config.table,
              columns: config.columns,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token || ''}`,
            },
          },
          table: config.table,
          primaryKey: config.primaryKey,
          shapeKey: config.shapeKey,
          onMustRefetch: async (tx) => {
            const resetFunction =
              TABLE_STORE_RESET_MAP[
                config.table as keyof typeof TABLE_STORE_RESET_MAP
              ]

            if (resetFunction) {
              const defaultValueKey =
                config.table.toUpperCase() as keyof typeof DEFAULT_STATE_VALUES
              const defaultValue = DEFAULT_STATE_VALUES[defaultValueKey]
              resetFunction(defaultValue as never)
            }

            await tx.query(`DELETE FROM ${config.table}`)
            debounce(() => {
              toast.info(
                'Your data is out of sync with the server. Your cache has been cleared.'
              )
            }, 200)
          },
        })

        syncResult.stream.subscribe(
          async (messages: Message<Row<unknown>>[]) => {
            if (Array.isArray(messages) && messages.length) {
              // Note: when an item is inserted into remote db that doesn't yet exist, the message
              // coming from the stream has an operation of 'insert', which causes a duplicate key error
              let hasPersonalDetailsChanges = false
              let hasExperienceChanges = false
              let hasProjectChanges = false
              let hasEducationChanges = false
              let hasSettingsChanges = false
              let hasSkillsChanges = false
              let hasResumeSkillsChanges = false

              messages.forEach(async (msg) => {
                if (isChangeMessage(msg)) {
                  if (config.table === 'personal_details') {
                    hasPersonalDetailsChanges = true
                  }
                  if (
                    config.table === 'experience' ||
                    config.table === 'experience_bullets'
                  ) {
                    hasExperienceChanges = true
                  }
                  if (
                    config.table === 'projects' ||
                    config.table === 'project_bullets'
                  ) {
                    hasProjectChanges = true
                  }
                  if (config.table === 'education') {
                    hasEducationChanges = true
                  }
                  if (config.table === 'app_settings') {
                    hasSettingsChanges = true
                  }
                  if (config.table === 'skills') {
                    hasSkillsChanges = true
                  }
                  if (config.table === 'resume_skills') {
                    hasResumeSkillsChanges = true
                  }
                }
              })

              if (hasPersonalDetailsChanges) {
                setTimeout(() => refreshPersonalDetails(), 200)
              }
              if (hasExperienceChanges) {
                setTimeout(() => refreshExperience(), 200)
              }
              if (hasProjectChanges) {
                setTimeout(() => refreshProjects(), 200)
              }
              if (hasEducationChanges) {
                setTimeout(() => refreshEducation(), 200)
              }
              if (hasSettingsChanges) {
                setTimeout(() => refreshSettings(), 200)
              }
              if (hasSkillsChanges || hasResumeSkillsChanges) {
                setTimeout(() => refreshSkills(), 200)
              }
            }

            set({
              syncState: 'syncing',
            })
          },
          (error) => {
            const err = error as Error
            if (err?.message?.includes('401')) {
              toast.warning('Your session expired.')
              useAuthStore.getState().signOut()
              set({
                error: createAuthError('User authentication failed', err),
              })
            } else {
              toast.error(
                'There was an unexpected error while synchronizing your data with the cloud.'
              )

              if (isNetworkError(err)) {
                set({
                  error: createNetworkError('Sync stream error', err),
                })
              } else {
                set({
                  error: createUnknownError('Sync stream error', err),
                })
              }
            }
          }
        )

        activeStreams.set(tableName, syncResult)
      }

      set({
        activeStreams,
        syncState: 'syncing',
        error: null,
      })
    } catch (error) {
      const err = error as Error

      toast.error('Failed to start data synchronization.')

      if (isNetworkError(err)) {
        set({
          syncState: 'error',
          error: createNetworkError('Failed to start sync', err),
        })
      } else {
        set({
          syncState: 'error',
          error: createUnknownError('Sync initialization failed', err),
        })
      }
    }
  },

  stopSync: async (tableNames?: string[]) => {
    const { activeStreams } = get()

    if (activeStreams.size === 0) {
      return
    }

    try {
      const tablesToStop = tableNames || Array.from(activeStreams.keys())

      for (const tableName of tablesToStop) {
        const syncResult = activeStreams.get(tableName)
        if (syncResult) {
          syncResult.unsubscribe()
          activeStreams.delete(tableName)
        }
      }

      set({
        activeStreams: new Map(activeStreams),
        syncState: activeStreams.size > 0 ? 'syncing' : 'idle',
        error: null,
      })
    } catch (error) {
      const err = error as Error
      set({
        error: createUnknownError('Failed to stop sync', err),
      })
    }
  },

  getStream: (tableName: string): ShapeStreamInterface<Row<unknown>> | null => {
    const { activeStreams } = get()
    const syncResult = activeStreams.get(tableName)
    return syncResult?.stream || null
  },

  startPushSync: (intervalMs: number = 5000) => {
    const currentTimer = get().pushSyncTimer
    if (currentTimer) {
      clearTimeout(currentTimer)
    }

    const runPush = async () => {
      try {
        const { db } = get()
        if (!db) {
          for (let i = 0; i < 20; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            const { db: currentDb } = get()
            if (currentDb) {
              break
            }
          }

          const { db: finalDb } = get()
          if (!finalDb) {
            set({
              error: createStorageError('Database not available for data sync'),
            })
            return
          }
        }

        await pushLocalChangesToRemote()
        set({ syncState: 'syncing', error: null })
      } catch (err) {
        const error = err as Error

        if (isNetworkError(error)) {
          set({
            syncState: 'error',
            error: createNetworkError('Push sync network error', error),
          })
        } else {
          set({
            syncState: 'error',
            error: createUnknownError('Push sync failed', error),
          })
        }
      }
    }

    const scheduleNextSync = (isRecurring: boolean = false) => {
      if (isRecurring && !get().pushSyncTimer) return

      if (firstSyncFlag) {
        // Delay first push to allow initialization to complete
        setTimeout(() => {
          runPush()
        }, 2000)
        firstSyncFlag = false
      }

      const timer = setTimeout(async () => {
        try {
          await runPush()

          if (get().pushSyncTimer) {
            scheduleNextSync(true)
          }
        } catch (error) {
          const err = error as Error

          if (isNetworkError(err)) {
            set({
              syncState: 'error',
              error: createNetworkError(
                'Recurring push sync network error',
                err
              ),
            })
          } else {
            set({
              syncState: 'error',
              error: createUnknownError('Recurring push sync failed', err),
            })
          }

          // Only schedule next sync if push sync is still active
          if (get().pushSyncTimer) {
            scheduleNextSync(true)
          }
        }
      }, intervalMs)

      set({ pushSyncTimer: timer })
    }

    scheduleNextSync()
  },

  stopPushSync: () => {
    try {
      const currentTimer = get().pushSyncTimer
      if (currentTimer) {
        clearTimeout(currentTimer)
        set({ pushSyncTimer: null, syncState: 'idle', error: null })
      }
    } catch (error) {
      const err = error as Error
      set({
        error: createUnknownError('Failed to stop push sync', err),
      })
    }
  },

  close: async () => {
    const { db, pushSyncTimer: pushSyncInterval } = get()
    if (!db) {
      set({
        error: createStorageError('Database instance does not exist'),
      })
      return
    }

    try {
      if (pushSyncInterval) {
        clearTimeout(pushSyncInterval)
      }

      await db.close()
      set({
        db: null,
        syncState: 'idle',
        error: null,
        activeStreams: new Map(),
        pushSyncTimer: null,
      })
    } catch (error) {
      const err = error as Error
      set({
        error: createStorageError('Failed to close database connection', err),
      })
    }
  },
}))
