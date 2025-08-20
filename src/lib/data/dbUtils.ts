import { supabase } from '@/lib/supabase/client'
import { nowIso } from '@/lib/data/dataUtils'
import type {
  BulletPoint,
  ExperienceBlockData,
  Month,
} from '@/lib/types/experience'
import { RawExperienceData } from '@/lib/types/experience'
import { PostgrestError } from '@supabase/supabase-js'

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
