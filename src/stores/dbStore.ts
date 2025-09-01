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
import { API_ROUTES } from '@/lib/constants'
import { Session } from '@supabase/supabase-js'
import {
  initializePersonalDetailsChangelogQuery,
  initializePersonalDetailsQuery,
} from '@/lib/sql'
import { useAuthStore } from './'
import { pushLocalChangesToRemote } from '@/lib/data/dbUtils'
import { usePersonalDetailsStore } from './'

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
  isOnline: boolean
  syncState: 'idle' | 'syncing' | 'error' | 'offline'
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  activeStreams: Map<string, SyncShapeToTableResult>
  tableConfigs: Map<string, TableSyncConfig>
  pushSyncTimer: NodeJS.Timeout | null
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

// TODO: need to handle a case of a different user loggining (aka, session doesn't match remote db user)
// In that case, we would reset the local db.
// Could tap into existing user tracking in page.tsx

export const useDbStore = create<DbStore>((set, get) => ({
  db: null,
  initializing: false,
  isOnline: false,
  syncState: 'idle',
  connectionState: 'disconnected',
  activeStreams: new Map(),
  tableConfigs: new Map(Object.entries(TABLE_CONFIGS)),
  pushSyncTimer: null,

  initialize: async () => {
    set({ initializing: true })

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
      console.error('Database initialization failed:', error)
      set({ initializing: false, syncState: 'error' })
      // TODO: If initialization fails, should we wipe the local db?
    }
  },

  registerTable: (config: TableSyncConfig) => {
    set((state) => ({
      tableConfigs: new Map(state.tableConfigs).set(config.table, config),
    }))
  },

  startSync: async (session: Session, tableNames?: string[]) => {
    const { db, activeStreams, tableConfigs } = get()
    const { refresh: refreshPersonalDetails } =
      usePersonalDetailsStore.getState()
    if (!db) return

    set({ connectionState: 'connecting' })

    try {
      await db.electric.initMetadataTables()

      const tablesToSync = tableNames || Array.from(tableConfigs.keys())

      for (const tableName of tablesToSync) {
        const config = tableConfigs.get(tableName)
        if (!config) {
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
            onError: (error) => {
              console.error('Electric error:', error)
            },
          },
          table: config.table,
          primaryKey: config.primaryKey,
          shapeKey: config.shapeKey,
          onMustRefetch: async (tx) => {
            await tx.query(`DELETE FROM ${config.table}`)
            console.info(`Local table ${config.table} was cleared`)
          },
        })

        syncResult.stream.subscribe(
          async (messages: Message<Row<unknown>>[]) => {
            if (Array.isArray(messages) && messages.length) {
              messages.forEach((msg) => {
                console.log('Electric message: ', msg)
                if (isChangeMessage(msg)) {
                  if (config.table === 'personal_details') {
                    setTimeout(() => refreshPersonalDetails(), 200)
                  }
                }
              })
            }

            set({
              connectionState: 'connected',
              syncState: 'syncing',
              isOnline: true,
            })
          }
        )

        activeStreams.set(tableName, syncResult)
      }

      set({
        activeStreams,
        connectionState: 'connected',
        syncState: 'syncing',
        isOnline: true,
      })
    } catch (error) {
      console.error('Sync failed:', error)
      set({
        connectionState: 'error',
        syncState: 'error',
        isOnline: false,
      })
    }
  },

  stopSync: async (tableNames?: string[]) => {
    const { activeStreams } = get()

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
      connectionState: activeStreams.size > 0 ? 'connected' : 'disconnected',
      syncState: activeStreams.size > 0 ? 'syncing' : 'idle',
      isOnline: activeStreams.size > 0,
    })
  },

  getStream: (tableName: string): ShapeStreamInterface<Row<unknown>> | null => {
    const { activeStreams } = get()
    const syncResult = activeStreams.get(tableName)
    return syncResult?.stream || null
  },

  startPushSync: (intervalMs = 10000) => {
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
            return
          }
        }

        await pushLocalChangesToRemote()
        set({ syncState: 'syncing' })
      } catch (err) {
        console.error('Push sync error:', err)
        set({ syncState: 'error' })
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
          console.error('Push sync error:', error)
          set({ syncState: 'error' })

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
    const currentTimer = get().pushSyncTimer
    if (currentTimer) {
      clearTimeout(currentTimer)
      set({ pushSyncTimer: null, syncState: 'idle' })
    }
  },

  close: async () => {
    const { db, pushSyncTimer: pushSyncInterval } = get()
    if (!db) return

    if (pushSyncInterval) {
      clearTimeout(pushSyncInterval)
    }

    try {
      await db.close()
      set({ db: null, isOnline: false, syncState: 'idle' })
    } catch (error) {
      console.error('Error closing local db connection: ', error)
    }
  },
}))
