import { create } from 'zustand'
import { PGlite } from '@electric-sql/pglite'
import {
  electricSync,
  SyncShapeToTableOptions,
  SyncShapeToTableResult,
  SyncShapesToTablesOptions,
  SyncShapesToTablesResult,
} from '@electric-sql/pglite-sync'
import { Row, ShapeStreamInterface } from '@electric-sql/client'
import { API_ROUTES } from '@/lib/constants'

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
  onDataChange?: (messages: unknown[]) => void
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
  startSync: () => Promise<void>
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
    ],
    primaryKey: ['id'],
    shapeKey: 'personal_details',
    onDataChange: (messages) => {
      console.log('Personal details updated:', messages)
    },
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
        updated_at TEXT,
        created_at TEXT
    );
`

const initializeTables = async (db: PGlite) => {
  try {
    await db.query(initializePersonalDetailsQuery)
  } catch (error) {
    console.error('Failed to initialize DB tables:', error)
  }
}

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

      // TODO: implement timed retry for sync
      // Need way to see if connection exists to avoid spamming requests
      await get().startSync()
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

  startSync: async (tableNames?: string[]) => {
    const { db, activeStreams, tableConfigs } = get()
    if (!db) return

    set({ connectionState: 'connecting' })

    try {
      await db.electric.initMetadataTables()

      const tablesToSync = tableNames || Array.from(tableConfigs.keys())

      for (const tableName of tablesToSync) {
        const config = tableConfigs.get(tableName)
        if (!config) {
          console.warn(`Table config not found for: ${tableName}`)
          continue
        }

        // Skip if already syncing
        if (activeStreams.has(tableName)) {
          console.log(`Already syncing table: ${tableName}`)
          continue
        }

        console.log(`Starting sync for table: ${tableName}`)

        const syncResult = await db.electric.syncShapeToTable({
          shape: {
            url: `${process.env.NEXT_PUBLIC_SITE_URL}${API_ROUTES.SHAPE_PROXY}`,
            params: {
              table: config.table,
              columns: config.columns,
            },
          },
          table: config.table,
          primaryKey: config.primaryKey,
          shapeKey: config.shapeKey,
        })

        // Subscribe to stream changes
        syncResult.stream.subscribe((messages) => {
          console.log(`Sync messages for ${tableName}:`, messages)

          // Call table-specific change handler
          config.onDataChange?.(messages)

          // Update global sync state
          set({
            connectionState: 'connected',
            syncState: 'syncing',
            isOnline: true,
          })
        })

        // Track the sync result
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

    // Determine which tables to stop syncing
    const tablesToStop = tableNames || Array.from(activeStreams.keys())

    for (const tableName of tablesToStop) {
      const syncResult = activeStreams.get(tableName)
      if (syncResult) {
        console.log(`Stopping sync for table: ${tableName}`)
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
