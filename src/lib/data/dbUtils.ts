import { supabase } from '@/lib/supabase/client'
import { nowIso, isAuthenticated, waitForAuthReady } from '@/lib/data/dataUtils'
import type {
  BulletPoint,
  ExperienceBlockData,
  Month,
} from '@/lib/types/experience'
import { RawExperienceData } from '@/lib/types/experience'
import { PostgrestError } from '@supabase/supabase-js'
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
        e_is_included: localRecord.isIncluded,
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
    | ExperienceBlockData[] // reorder
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
  syncToRemote: (change: T) => Promise<void>
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
    await config.syncToRemote(latestChange)

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

  console.info(
    `Found ${unsyncedChanges.length} unsynced changes for ${config.datasetName}`
  )

  // for (const change of unsyncedChanges) {
  //   try {
  //     await config.syncToRemote(change)

  //     await db.query(config.markSyncedQuery, [true, change.write_id])

  //     console.info(
  //       `Successfully synced ${config.datasetName} change: ${change.write_id}`
  //     )
  //   } catch (error) {
  //     console.error(
  //       `Failed to sync ${config.datasetName} change ${change.write_id}:`,
  //       error
  //     )
  //     // Mark as failed but continue with other changes
  //     await db.query(config.markSyncedQuery, [false, change.write_id])
  //   }
  // }

  await db.query(config.cleanupQuery, [userId])
}

async function syncPersonalDetailsToRemote(
  change: PersonalDetailsChange
): Promise<void> {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: serverData } = await supabase
        .from('personal_details')
        .select('updated_at')
        .single()

      if (serverData?.updated_at) {
        const serverTime = new Date(serverData.updated_at).getTime()
        const localTime = new Date(change.timestamp || 0).getTime()
        const timeDiff = serverTime - localTime

        if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
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
      return
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

async function syncExperienceToRemote(change: ExperienceChange) {
  console.log(
    'syncExperienceToRemote called:',
    change.operation,
    change.write_id
  )

  // switch (change.operation) {
  //   case 'upsert':
  //     console.log('Would upsert experience:', change.value)
  //     break
  //   case 'delete':
  //     console.log(
  //       'Would delete experience:',
  //       (change.value as { id: string }).id
  //     )
  //     break
  //   case 'reorder':
  //     console.log('Would reorder experiences:', change.value)
  //     break
  //   case 'upsert_bullets':
  //   case 'delete_bullets':
  //   case 'toggle_bullet_lock':
  //   case 'toggle_bullets_lock_all':
  //     console.log(
  //       'Would sync bullets for experience:',
  //       (change.value as BulletChangeData).experienceId
  //     )
  //     break
  // }

  // return Promise.resolve()
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
