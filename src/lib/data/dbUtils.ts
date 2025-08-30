import { supabase } from '@/lib/supabase/client'
import { nowIso, isAuthenticated, waitForAuthReady } from '@/lib/data/dataUtils'
import type {
  BulletPoint,
  ExperienceBlockData,
  Month,
} from '@/lib/types/experience'
import { RawExperienceData } from '@/lib/types/experience'
import { PostgrestError } from '@supabase/supabase-js'
import { useDbStore } from '@/stores'
import type { PersonalDetails } from '@/lib/types/personalDetails'
import { ElectricDb } from '@/stores/dbStore'
import {
  cleanUpSyncedChangelogEntriesQuery,
  selectUnsyncedRowsQuery,
  updatePersonalDetailChangelogQuery,
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

// TODO: there's a problem with this approach.
// If the user make rapid changes, the database takes a bit of time to update, and the
// updated timestamp comes back as being more recent than some of the local changes,
// causing the local changes to be discarded, although technically they're newer.
const syncWithAtomicity = async (
  db: ElectricDb | null,
  row: PersonalDetailsChange
): Promise<void> => {
  if (!db) throw new Error('Local DB not initialized')

  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: serverData } = await supabase
        .from('personal_details')
        .select('updated_at')
        .single()

      if (serverData?.updated_at) {
        const serverTime = new Date(serverData.updated_at).getTime()
        const localTime = new Date(row.timestamp || 0).getTime()

        // If local data is NOT newer than server, delete it (server is source of truth)
        if (serverTime >= localTime) {
          console.info('Local data is stale, removing from changelog')
          // TODO: notify client via toast
          await db.query(updatePersonalDetailChangelogQuery, [
            true,
            row.write_id,
          ])
          return
        }
      } else {
        console.info('No server data found, proceeding with local changes')
      }

      const { error: pushError } = await supabase.rpc(
        'upsert_personal_details',
        {
          p_name: row.value.name,
          p_email: row.value.email,
          p_phone: row.value.phone || '',
          p_location: row.value.location || '',
          p_linkedin: row.value.linkedin || '',
          p_github: row.value.github || '',
          p_website: row.value.website || '',
        }
      )

      if (pushError) throw pushError

      await db.query(updatePersonalDetailChangelogQuery, [true, row.write_id])

      return
    } catch (error) {
      console.error(`Sync attempt ${attempt + 1} failed:`, error)

      if (attempt === maxRetries - 1) {
        await db.query(updatePersonalDetailChangelogQuery, [
          false,
          row.write_id,
        ])
        throw error
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
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
}

export const pushLocalChangesToRemote = async () => {
  const { db } = useDbStore.getState()
  if (!db) throw new Error('Local DB not initialized')

  await waitForAuthReady()
  if (!isAuthenticated()) {
    return
  }

  const unsyncedRows = await db.query<PersonalDetailsChange>(
    selectUnsyncedRowsQuery
  )

  if (!unsyncedRows?.rows?.length) return

  for (const row of unsyncedRows.rows) {
    if (row.operation !== 'update') continue

    try {
      await syncWithAtomicity(db, row)
    } catch (error) {
      console.error('Failed to sync row:', row.write_id, error)
    }
  }

  // TODO: Create a daily job for cleanup?
  await db.query(cleanUpSyncedChangelogEntriesQuery)
}
