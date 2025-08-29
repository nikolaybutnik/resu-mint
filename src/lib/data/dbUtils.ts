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

export const pushLocalChangesToRemote = async () => {
  const { db } = useDbStore.getState()
  if (!db) throw new Error('Local DB not initialized')

  await waitForAuthReady()
  if (!isAuthenticated()) {
    return
  }

  const unsyncedRows = await db.query<PersonalDetailsChange>(
    'SELECT * FROM personal_details_changes WHERE synced = FALSE ORDER BY id ASC'
  )

  if (!unsyncedRows?.rows?.length) return

  for (const row of unsyncedRows.rows) {
    if (row.operation !== 'update') return

    try {
      const { error } = await supabase.rpc('upsert_personal_details', {
        p_name: row.value.name,
        p_email: row.value.email,
        p_phone: row.value.phone || '',
        p_location: row.value.location || '',
        p_linkedin: row.value.linkedin || '',
        p_github: row.value.github || '',
        p_website: row.value.website || '',
      })

      if (error) {
        console.error('Failed to push change to remote:', error)
        // Don't mark as synced if there was an error
        continue
      }

      await db.query(
        `UPDATE personal_details_changes SET synced = TRUE WHERE write_id = $1`,
        [row.write_id]
      )
    } catch (error) {
      console.error('Unexpected error during data sync:', error)
    }
  }
}
