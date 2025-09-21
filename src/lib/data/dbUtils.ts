import { supabase } from '@/lib/supabase/client'
import { nowIso, isAuthenticated, waitForAuthReady } from '@/lib/data/dataUtils'
import { PostgrestError } from '@supabase/supabase-js'
import type {
  BulletPoint,
  ExperienceBlockData,
  Month,
} from '@/lib/types/experience'
import { RawExperienceData } from '@/lib/types/experience'
import { useAuthStore, useDbStore } from '@/stores'
import type { PersonalDetails } from '@/lib/types/personalDetails'
import { ElectricDb } from '@/stores/dbStore'
import {
  cleanUpSyncedPersonalDetailsChangelogEntriesQuery,
  updatePersonalDetailChangelogQuery,
  selectLatestUnsyncedPersonalDetailsChangeQuery,
  markPreviousPersonalDetailsChangesAsSyncedQuery,
  selectAllUnsyncedExperienceChangesQuery,
  updateExperienceChangelogQuery,
  cleanUpSyncedExperienceChangelogEntriesQuery,
} from '../sql'

function isRecordNotFoundError(error: PostgrestError | null): boolean {
  if (!error) return false

  return (
    error.code === 'PGRST116' || // No rows found (.single() on empty result)
    error.code === 'PGRST406' || // Not Acceptable (.single() with multiple rows or other issues)
    error.message?.includes('relation') ||
    error.message?.includes('does not exist') ||
    error.message?.includes('0 rows') ||
    error.message?.includes('Not Acceptable')
  )
}

export async function pullExperienceDbRecordToLocal(
  dbRecord: RawExperienceData,
  localBulletPoints: BulletPoint[] = []
): Promise<ExperienceBlockData> {
  const localRecord: ExperienceBlockData = {
    id: dbRecord.id,
    title: dbRecord.title,
    companyName: dbRecord.company_name,
    location: dbRecord.location,
    description: dbRecord.description || '',
    startDate: {
      year: dbRecord.start_year?.toString() || '',
      month: (dbRecord.start_month as Month) || '',
    },
    endDate: {
      year: dbRecord.end_year?.toString() || '',
      month: (dbRecord.end_month as Month) || '',
      isPresent: dbRecord.is_present || false,
    },
    isIncluded: dbRecord.is_included || true,
    position: dbRecord.position || 0,
    bulletPoints: localBulletPoints,
    updatedAt: dbRecord.updated_at || nowIso(),
  }
  return localRecord
}

export async function pushExperienceLocalRecordToDb(
  localRecord: ExperienceBlockData
): Promise<{ updatedAt: string; error: PostgrestError | string | null }> {
  try {
    const { data: serverUpdatedAt, error } = await supabase.rpc(
      'upsert_experience',
      {
        e_id: localRecord.id,
        e_title: localRecord.title,
        e_company_name: localRecord.companyName,
        e_location: localRecord.location,
        e_description: localRecord.description || '',
        e_start_month: localRecord.startDate.month ?? '',
        e_start_year: Number(localRecord.startDate.year),
        e_end_month: localRecord.endDate.month ?? '',
        e_end_year: Number(localRecord.endDate.year),
        e_is_present: localRecord.endDate.isPresent,
        e_is_included: localRecord.isIncluded ?? true,
        e_position: localRecord.position || 0,
      }
    )

    if (error) {
      return {
        updatedAt: localRecord.updatedAt || nowIso(),
        error,
      }
    }

    return { updatedAt: serverUpdatedAt || nowIso(), error: null }
  } catch (error) {
    return {
      updatedAt: localRecord.updatedAt || nowIso(),
      error:
        error instanceof Error
          ? error.message
          : new Error('Unknown error').message,
    }
  }
}

interface PersonalDetailsChange {
  id: number
  operation: 'insert' | 'update' | 'delete'
  value: PersonalDetails
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface ExperienceChange {
  id: number
  operation:
    | 'upsert'
    | 'delete'
    | 'reorder'
    | 'upsert_bullets'
    | 'delete_bullets'
    | 'toggle_bullet_lock'
    | 'toggle_bullets_lock_all'
  value:
    | ExperienceBlockData // upsert
    | { id: string; position: number }[] // reorder
    | { id: string } // delete
    | BulletChangeData // upsert_bullets, delete_bullets, toggle_bullet_lock, toggle_bullets_lock_all
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface BulletChangeData {
  experienceId: string
  data?: BulletPoint[]
  bulletIds?: string[]
}

interface SyncConfig<T> {
  datasetName: string
  getLatestUnsyncedQuery: string
  markSyncedQuery: string
  markPreviousAsSyncedQuery?: string
  cleanupQuery: string
  syncToRemote: (
    change: T,
    db: ElectricDb,
    config: SyncConfig<T>
  ) => Promise<void>
  syncMode: 'single' | 'batch'
}

async function syncDataset<T extends { write_id: string; timestamp: string }>(
  db: ElectricDb,
  userId: string | undefined,
  config: SyncConfig<T>
): Promise<void> {
  if (config.syncMode === 'single') {
    await syncSingleLatest(db, userId, config)
  } else {
    await syncAllUnsynced(db, userId, config)
  }
}

async function syncSingleLatest<
  T extends { write_id: string; timestamp: string }
>(
  db: ElectricDb,
  userId: string | undefined,
  config: SyncConfig<T>
): Promise<void> {
  const result = await db.query<T>(config.getLatestUnsyncedQuery, [userId])
  const [latestChange] = result?.rows

  if (!latestChange) {
    await db.query(config.cleanupQuery, [userId])
    return
  }

  try {
    await config.syncToRemote(latestChange, db, config)

    await db.query(config.markSyncedQuery, [true, latestChange.write_id])

    if (config.markPreviousAsSyncedQuery) {
      await db.query(config.markPreviousAsSyncedQuery, [
        latestChange.timestamp,
        userId,
      ])
    }
  } catch (error) {
    console.error(`Failed to sync ${config.datasetName}:`, error)

    await db.query(config.markSyncedQuery, [false, latestChange.write_id])
    throw error
  }

  await db.query(config.cleanupQuery, [userId])
}

async function syncAllUnsynced<
  T extends { write_id: string; timestamp: string }
>(
  db: ElectricDb,
  userId: string | undefined,
  config: SyncConfig<T>
): Promise<void> {
  const result = await db.query<T>(config.getLatestUnsyncedQuery, [userId])
  const unsyncedChanges = result?.rows || []

  if (!unsyncedChanges.length) {
    await db.query(config.cleanupQuery, [userId])
    return
  }

  for (const change of unsyncedChanges) {
    try {
      await config.syncToRemote(change, db, config)
      await db.query(config.markSyncedQuery, [true, change.write_id])
    } catch (error) {
      console.error(
        `Failed to sync ${config.datasetName} change ${change.write_id}:`,
        error
      )
      // Mark as failed but continue with other changes
      await db.query(config.markSyncedQuery, [false, change.write_id])
    }
  }

  await db.query(config.cleanupQuery, [userId])
}

async function syncPersonalDetailsToRemote(
  change: PersonalDetailsChange,
  db: ElectricDb,
  config: SyncConfig<PersonalDetailsChange>
): Promise<void> {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: serverData, error: serverError } = await supabase
        .from('personal_details')
        .select('updated_at')
        .maybeSingle()

      if (isRecordNotFoundError(serverError)) {
        // Record doesn't exist, skip upsert - nothing to sync
      } else if (serverError) {
        throw serverError
      }

      if (serverData?.updated_at) {
        const serverTime = new Date(serverData.updated_at).getTime()
        const localTime = new Date(change.timestamp || 0).getTime()
        const timeDiff = serverTime - localTime

        if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
          // Server has newer data, mark local change as synced to avoid conflict
          await db.query(config.markSyncedQuery, [true, change.write_id])
          return
        }
      }

      const { error } = await supabase.rpc('upsert_personal_details', {
        p_name: change.value.name,
        p_email: change.value.email,
        p_phone: change.value.phone || '',
        p_location: change.value.location || '',
        p_linkedin: change.value.linkedin || '',
        p_github: change.value.github || '',
        p_website: change.value.website || '',
      })

      if (error) throw error

      await db.query(config.markSyncedQuery, [true, change.write_id])
      return
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

const upsertExperience = async (
  change: ExperienceChange,
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
): Promise<void> => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const experienceBlock = change.value as ExperienceBlockData

      const { data: serverData, error: serverError } = await supabase
        .from('experience')
        .select('updated_at')
        .eq('id', experienceBlock.id)
        .maybeSingle()

      if (isRecordNotFoundError(serverError)) {
        // Record doesn't exist, skip upsert - nothing to sync
      } else if (serverError) {
        throw serverError
      }

      if (serverData?.updated_at) {
        const serverTime = new Date(serverData.updated_at).getTime()
        const localTime = new Date(change.timestamp || 0).getTime()
        const timeDiff = serverTime - localTime

        if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
          // Server has newer data, mark local change as synced to avoid conflict
          await db.query(config.markSyncedQuery, [true, change.write_id])
          return
        }
      }

      const { error } = await supabase.rpc('upsert_experience', {
        e_id: experienceBlock.id,
        e_title: experienceBlock.title,
        e_company_name: experienceBlock.companyName,
        e_location: experienceBlock.location,
        e_description: experienceBlock.description || '',
        e_start_month: experienceBlock.startDate.month ?? '',
        e_start_year: Number(experienceBlock.startDate.year),
        e_end_month: experienceBlock.endDate.month ?? '',
        e_end_year: Number(experienceBlock.endDate.year),
        e_is_present: experienceBlock.endDate.isPresent,
        e_is_included: experienceBlock.isIncluded ?? true,
        e_position: experienceBlock.position ?? 0,
      })

      if (error) throw error

      await db.query(config.markSyncedQuery, [true, change.write_id])
      return
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

const deleteExperience = async (
  change: ExperienceChange,
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
): Promise<void> => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id } = change.value as { id: string }

      const { data: serverData, error: serverError } = await supabase
        .from('experience')
        .select('updated_at')
        .eq('id', id)
        .maybeSingle()

      if (isRecordNotFoundError(serverError)) {
        // The item does not exist, skip delete, mark row as synced
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      } else if (serverError) {
        throw serverError
      }

      if (serverData?.updated_at) {
        const serverTime = new Date(serverData.updated_at).getTime()
        const localTime = new Date(change.timestamp || 0).getTime()
        const timeDiff = serverTime - localTime

        if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
          // Server has newer data, mark local change as synced to avoid conflict
          await db.query(config.markSyncedQuery, [true, change.write_id])
          return
        }
      }

      const { error } = await supabase.rpc('delete_experience', {
        e_ids: [id],
      })

      if (error) throw error

      await db.query(config.markSyncedQuery, [true, change.write_id])
      return
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

const reorderExperience = async (
  change: ExperienceChange,
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      for (const row of change.value as { id: string; position: number }[]) {
        const { error: serverError } = await supabase
          .from('experience')
          .update({ position: row.position })
          .eq('id', row.id)

        if (isRecordNotFoundError(serverError)) {
          // Record doesn't exist remotely - skip until record gets upserted
        } else if (serverError) {
          throw serverError
        }
      }

      await db.query(config.markSyncedQuery, [true, change.write_id])
      return
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

const upsertExperienceBullets = async (
  change: ExperienceChange,
  _db: ElectricDb,
  _config: SyncConfig<ExperienceChange>
): Promise<void> => {
  console.log(change)
}

async function syncExperienceToRemote(
  change: ExperienceChange,
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
) {
  switch (change.operation) {
    case 'upsert':
      await upsertExperience(change, db, config)
      break
    case 'delete':
      await deleteExperience(change, db, config)
      break
    case 'reorder':
      await reorderExperience(change, db, config)
      break
    case 'upsert_bullets':
      await upsertExperienceBullets(change, db, config)
      break
    //   case 'delete_bullets':
    //   case 'toggle_bullet_lock':
    //   case 'toggle_bullets_lock_all':
    //     console.log(
    //       'Would sync bullets for experience:',
    //       (change.value as BulletChangeData).experienceId
    //     )
    //     break
  }
}

const SYNC_CONFIGS = {
  personal_details: {
    datasetName: 'personal_details',
    getLatestUnsyncedQuery: selectLatestUnsyncedPersonalDetailsChangeQuery,
    markSyncedQuery: updatePersonalDetailChangelogQuery,
    markPreviousAsSyncedQuery: markPreviousPersonalDetailsChangesAsSyncedQuery,
    cleanupQuery: cleanUpSyncedPersonalDetailsChangelogEntriesQuery,
    syncToRemote: syncPersonalDetailsToRemote,
    syncMode: 'single',
  } as SyncConfig<PersonalDetailsChange>,

  experience: {
    datasetName: 'experience',
    getLatestUnsyncedQuery: selectAllUnsyncedExperienceChangesQuery,
    markSyncedQuery: updateExperienceChangelogQuery,
    cleanupQuery: cleanUpSyncedExperienceChangelogEntriesQuery,
    syncToRemote: syncExperienceToRemote,
    syncMode: 'batch',
  } as SyncConfig<ExperienceChange>,
} as const

export const pushLocalChangesToRemote = async () => {
  const { user } = useAuthStore.getState()
  const { db } = useDbStore.getState()
  if (!db) throw new Error('Local DB not initialized')

  await waitForAuthReady()
  if (!isAuthenticated()) return

  const personalDetailsConfig = SYNC_CONFIGS.personal_details
  try {
    await syncDataset(db, user?.id, personalDetailsConfig)
  } catch (error) {
    console.error(`Error syncing personal_details:`, error)
  }

  const experienceConfig = SYNC_CONFIGS.experience
  try {
    await syncDataset(db, user?.id, experienceConfig)
  } catch (error) {
    console.error(`Error syncing experience:`, error)
  }
}

export { SYNC_CONFIGS }
