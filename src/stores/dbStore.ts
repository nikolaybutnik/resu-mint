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
import { useAuthStore } from './authStore'
import { Session } from '@supabase/supabase-js'

type ElectricDb = PGlite & {
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
  initialize: () => Promise<void>
  startSync: (session: Session, tableNames?: string[]) => Promise<void>
  stopSync: () => Promise<void>
  close: () => void
  registerTable: (config: TableSyncConfig) => void
  getStream: (tableName: string) => ShapeStreamInterface<Row<unknown>> | null
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

const initializePersonalDetailsQuery = `
    CREATE TABLE IF NOT EXISTS personal_details (
        id UUID PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        location TEXT,
        linkedin TEXT,
        github TEXT,
        website TEXT,
        updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ
    );
`

const initializeTables = async (db: PGlite) => {
  try {
    await db.query(initializePersonalDetailsQuery)
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

  initialize: async () => {
    set({ initializing: true })

    try {
      const db = (await PGlite.create('idb://resumint-local', {
        extensions: { electric: electricSync() },
      })) as ElectricDb

      await initializeTables(db)

      set({ db, initializing: false })

      const session = useAuthStore.getState().session

      // TODO: implement timed retry for sync
      // Need way to see if connection exists to avoid spamming requests
      if (session) {
        await get().startSync(session)
      }
    } catch (error) {
      console.error('Database initialization failed:', error)
      set({ initializing: false, syncState: 'error' })
    }
  },

  registerTable: (config: TableSyncConfig) => {
    set((state) => ({
      tableConfigs: new Map(state.tableConfigs).set(config.table, config),
    }))
  },

  startSync: async (session: Session, tableNames?: string[]) => {
    const { db, activeStreams, tableConfigs } = get()
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
            url: `${process.env.NEXT_PUBLIC_SITE_URL}${API_ROUTES.SHAPE_PROXY}`,
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
        })

        syncResult.stream.subscribe(
          async (messages: Message<Row<unknown>>[]) => {
            messages.forEach((msg) => {
              if (isChangeMessage(msg)) {
                console.log('Data updated: ', msg?.value)
              } else console.log('No changes: ', msg)
            })

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

  close: async () => {
    const { db } = get()
    if (!db) return

    try {
      await db.close()
      set({ db: null, isOnline: false, syncState: 'idle' })
    } catch (error) {
      console.error('Error closing local db connection: ', error)
    }
  },
}))
