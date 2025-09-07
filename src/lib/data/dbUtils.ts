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
  cleanUpSyncedChangelogEntriesQuery,
  updatePersonalDetailChangelogQuery,
  selectLatestUnsyncedPersonalDetailsChangeQuery,
  markPreviousPersonalDetailsChangesAsSyncedQuery,
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

const syncWithAtomicity = async (
  db: ElectricDb | null,
  row: PersonalDetailsChange
): Promise<void> => {
  if (!db) throw new Error('Local DB not initialized')

  const maxRetries = 3
  const TOLERANCE_MS = 30000 // 30 seconds tolerance between client and server

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: serverData } = await supabase
        .from('personal_details')
        .select('updated_at')
        .single()

      if (serverData?.updated_at) {
        const serverTime = new Date(serverData.updated_at).getTime()
        const localTime = new Date(row.timestamp || 0).getTime()
        const timeDiff = serverTime - localTime

        if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
          console.info(
            'Local data is stale (beyond tolerance), removing from changelog'
          )
          // TODO: notify client via toast
          await db.query(updatePersonalDetailChangelogQuery, [
            true,
            row.write_id,
          ])
          return
        } else if (serverTime > localTime && timeDiff <= TOLERANCE_MS) {
          console.info(
            'Server slightly ahead within tolerance - pushing local changes'
          )
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
  const { user } = useAuthStore.getState()
  const { db } = useDbStore.getState()
  if (!db) throw new Error('Local DB not initialized')

  // TODO: implement user_id into changes table and write/read only records matching user_id
  console.log('USER ID: ', user?.id)

  await waitForAuthReady()
  if (!isAuthenticated()) {
    return
  }

  const latestChange = await db.query<PersonalDetailsChange>(
    selectLatestUnsyncedPersonalDetailsChangeQuery
  )

  if (!latestChange?.rows?.length) {
    await db.query(cleanUpSyncedChangelogEntriesQuery)
    return
  }

  const [row] = latestChange.rows

  try {
    await syncWithAtomicity(db, row)

    await db.query(markPreviousPersonalDetailsChangesAsSyncedQuery, [
      row.timestamp,
    ])
  } catch (error) {
    console.error('Failed to sync latest personal details change:', error)
    // Don't mark as synced if push failed - will retry on next push attempt
  }

  // TODO: Create a daily job for cleanup?
  await db.query(cleanUpSyncedChangelogEntriesQuery)
}
