import { supabase } from '@/lib/supabase/client'
import { nowIso } from '@/lib/data/dataUtils'
import type {
  BulletPoint,
  ExperienceBlockData,
  Month,
} from '@/lib/types/experience'
import { RawExperienceData } from '@/lib/types/experience'
import { PostgrestError } from '@supabase/supabase-js'
import { useDbStore } from '@/stores'
import type { PersonalDetails } from '@/lib/types/personalDetails'
import type { Json } from '@/lib/types/database'

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
}

// TODO: extend for other tables
export const pushLocalChangesToRemote = async () => {
  const { db } = useDbStore.getState()
  if (!db) throw new Error('Local DB not initialized')

  const unsyncedRows = await db.query<PersonalDetailsChange>(
    'SELECT * FROM personal_details_changes WHERE synced = FALSE ORDER BY id ASC'
  )

  if (!unsyncedRows?.rows?.length) return

  for (const row of unsyncedRows.rows) {
    try {
      const { error } = await supabase.from('personal_details_changes').upsert(
        {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          operation: row.operation,
          value: row.value as unknown as Json,
          write_id: row.write_id,
          timestamp: row.timestamp,
        },
        { onConflict: 'write_id' }
      )

      if (error) {
        console.error('Failed to push change to remote:', error)
        continue
      }

      // Mark synced locally to mark having pushed up to remote db.
      await db.query(
        `UPDATE personal_details_changes SET synced = TRUE WHERE write_id = $1`,
        [row.write_id]
      )
    } catch (error) {
      console.error('Unexpected error pushing change:', error)
    }
  }
}

// TODO: extend for other tables
// TODO: BUG - this onyl works if I'm logged in in both browsers.
// If I update some data in one browser without other active connections:
// 1. Data is written to local db
// 2. Data is written to local changelog
// 3. Changelog is pushed up to remote db and marked synced locally
// 4. Changelog is pulled down. Since the write originated locally, the remote change is marked synced.
// 5. Local changelog row is deleted.
// PROBLEM: personal_details is NEVER UPDATED. Remote db is out of date.
export const pullRemoteChangesToLocal = async () => {
  const { db } = useDbStore.getState()
  if (!db) throw new Error('Local DB not initialized')

  const { data: remoteUnsyncedRows, error } = await supabase
    .from('personal_details_changes')
    .select('user_id, operation, value, write_id, timestamp, synced')
    .eq('synced', false)
    .order('timestamp', {
      ascending: true,
    })

  if (error) {
    console.error('Failed to pull remote changes:', error)
    return
  }

  if (!remoteUnsyncedRows?.length) return

  // local write_ids are used to identify "our" locally-originated writes
  const localWriteIdsRes = await db.query<{ write_id: string }>(
    'SELECT write_id FROM personal_details_changes'
  )
  const localWriteIds = new Set(localWriteIdsRes.rows.map((r) => r.write_id))

  const ourWrites: string[] = []
  const foreignWrites: string[] = []

  for (const remote of remoteUnsyncedRows) {
    if (localWriteIds.has(remote.write_id)) {
      ourWrites.push(remote.write_id)
    } else {
      foreignWrites.push(remote.write_id)
    }
  }

  if (ourWrites.length) {
    const placeholders = ourWrites.map((_, i) => `$${i + 1}`).join(',')

    try {
      await db.query(
        `DELETE FROM personal_details_changes WHERE write_id IN (${placeholders})`,
        ourWrites
      )
    } catch (error) {
      console.error('Failed to delete local queued rows: ', error)
    }

    // TODO: delete synced rows later?
    const { error: upstreamError } = await supabase
      .from('personal_details_changes')
      .update({ synced: true })
      .in('write_id', ourWrites)

    if (upstreamError) {
      console.error('Failed to synchronize with remote server: ', upstreamError)
    }
  }

  if (foreignWrites.length) {
    const { error: upstreamError } = await supabase
      .from('personal_details_changes')
      .update({ synced: true })
      .in('write_id', foreignWrites)

    if (upstreamError) {
      console.error('Failed to synchronize with remote server: ', upstreamError)
    }

    const foreignDataToInsert = remoteUnsyncedRows
      .filter((row) => foreignWrites.includes(row.write_id))
      .map((row) => row.value) as unknown as PersonalDetails[]
    // Write to remote, Electric will sync down from there
    for (const entry of foreignDataToInsert) {
      const { error } = await supabase.rpc('upsert_personal_details', {
        p_name: entry.name,
        p_email: entry.email,
        p_github: entry.github || '',
        p_linkedin: entry.linkedin || '',
        p_location: entry.location || '',
        p_phone: entry.phone || '',
        p_website: entry.website || '',
      })

      if (error) {
        console.error('Failed to write new data to remote server: ', error)
      }
    }
  }
}
