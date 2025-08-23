import { PGlite } from '@electric-sql/pglite'
import { electricSync } from '@electric-sql/pglite-sync'

type ElectricDb = PGlite & {
  electric: {
    initMetadataTables: () => Promise<void>
    syncShapesToTables: (options: any) => Promise<any>
    syncShapeToTable: (options: any) => Promise<any>
    deleteSubscription: (key: string) => Promise<void>
  }
}

let dbInstance: ElectricDb | null = null
let dbPromise: Promise<ElectricDb> | null = null

export const getLocalDB = (): Promise<ElectricDb> => {
  if (dbInstance) return Promise.resolve(dbInstance)

  if (!dbPromise) {
    dbPromise = (async (): Promise<ElectricDb> => {
      const db = await PGlite.create({
        path: 'idb://resumint-local',
        extensions: { electric: electricSync() },
      })
      dbInstance = db as unknown as ElectricDb
      return dbInstance
    })()
  }

  return dbPromise
}

export const initializeDb = async () => {
  const db = await getLocalDB()

  // Create your tables
  await db.exec(`
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
    `)
}

export const closeDb = async () => {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}
