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
import { Session } from '@supabase/supabase-js'
import {
  initializePersonalDetailsChangelogQuery,
  initializePersonalDetailsQuery,
} from '@/lib/sql'
import { useAuthStore } from './'
import { pushLocalChangesToRemote } from '@/lib/data/dbUtils'
import { usePersonalDetailsStore } from './'
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
}

const initializeTables = async (db: PGlite) => {
  try {
    await db.query(initializePersonalDetailsQuery)
    await db.query(initializePersonalDetailsChangelogQuery)
  } catch (error) {
    console.error('Failed to initialize DB tables:', error)
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
        await get().startSync(session)
        get().startPushSync()
      }
    } catch (error) {
      const err = error as Error
      console.error('DB init failed:', err)

      if (
        err.message?.includes('already exists') ||
        err.message?.includes('does not exist') ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('violates')
      ) {
        try {
          console.warn('Schema conflict detected, attempting recovery...')
          await PGlite.create('idb://resumint-local', {
            extensions: { electric: electricSync() },
          })
          // Retry init once
          return await get().initialize()
        } catch (retryError) {
          console.error('Schema recovery failed:', retryError)
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
      console.error('Failed to register table:', err)
      set({
        error: createValidationError('Failed to register table', err),
      })
    }
  },

  startSync: async (session: Session, tableNames?: string[]) => {
    const { db, activeStreams, tableConfigs } = get()
    const { refresh: refreshPersonalDetails } =
      usePersonalDetailsStore.getState()
    if (!db) {
      set({
        error: createStorageError('Database not initialized'),
      })
      return
    }

    set({ syncState: 'connecting', error: null })

    try {
      await db.electric.initMetadataTables()

      const tablesToSync = tableNames || Array.from(tableConfigs.keys())

      for (const tableName of tablesToSync) {
        const config = tableConfigs.get(tableName)
        if (!config) {
          console.warn(`No config found for table: ${tableName}`)
          continue
        }

        if (activeStreams.has(tableName)) {
          continue
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
            usePersonalDetailsStore.setState({
              data: DEFAULT_STATE_VALUES.PERSONAL_DETAILS,
            })
            await tx.query(`DELETE FROM ${config.table}`)
            toast.warning(
              'Local data is out of sync with the server. Your cache has been cleared.'
            )
          },
        })

        syncResult.stream.subscribe(
          async (messages: Message<Row<unknown>>[]) => {
            if (Array.isArray(messages) && messages.length) {
              let hasPersonalDetailsChanges = false

              messages.forEach(async (msg) => {
                if (isChangeMessage(msg)) {
                  if (config.table === 'personal_details') {
                    hasPersonalDetailsChanges = true
                  }
                }
              })

              if (hasPersonalDetailsChanges) {
                setTimeout(() => refreshPersonalDetails(), 200)
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
      console.error('Sync failed:', err)

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
        activeStreams,
        syncState: activeStreams.size > 0 ? 'syncing' : 'idle',
        error: null,
      })
    } catch (error) {
      const err = error as Error
      console.error('Failed to stop sync:', err)
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

  startPushSync: (intervalMs = 5000) => {
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
        console.error('Push sync error:', error)

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

    const scheduleNextSync = (isRecurring = false) => {
      if (isRecurring && !get().pushSyncTimer) return

      runPush()

      const timer = setTimeout(async () => {
        try {
          await runPush()

          if (get().pushSyncTimer) {
            scheduleNextSync(true)
          }
        } catch (error) {
          const err = error as Error
          console.error('Push sync error:', err)

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
      console.error('Failed to stop push sync:', err)
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
      console.error('Error closing local db connection:', err)
      set({
        error: createStorageError('Failed to close database connection', err),
      })
    }
  },
}))
