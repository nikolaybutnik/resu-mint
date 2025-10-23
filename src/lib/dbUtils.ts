import { supabase } from '@/lib/supabase/client'
import { nowIso, isAuthenticated, waitForAuthReady } from '@/lib/data/dataUtils'
import { PostgrestError } from '@supabase/supabase-js'
import type { BulletPoint, ExperienceBlockData } from '@/lib/types/experience'
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
  updateExperiencePositionQuery,
  updateExperienceBulletPositionQuery,
  selectAllUnsyncedProjectChangesQuery,
  updateProjectChangelogQuery,
  cleanUpSyncedProjectChangelogEntriesQuery,
  updateProjectPositionQuery,
  updateProjectBulletPositionQuery,
  selectAllUnsyncedEducationChangesQuery,
  updateEducationChangelogQuery,
  cleanUpSyncedEducationChangelogEntriesQuery,
  updateEducationPositionQuery,
  updateSettingsChangelogQuery,
  cleanUpSyncedSettingsChangelogEntriesQuery,
  selectLatestUnsyncedSettingsChangeQuery,
  markPreviousSettingsChangesAsSyncedQuery,
  updateSkillsChangelogQuery,
  cleanUpSyncedSkillsChangelogEntriesQuery,
  selectLatestUnsyncedSkillsChangeQuery,
  markPreviousSkillsChangesAsSyncedQuery,
  selectAllUnsyncedResumeSkillsChangesQuery,
  updateResumeSkillsChangelogQuery,
  cleanUpSyncedResumeSkillsChangelogEntriesQuery,
} from './sql'
import { ProjectBlockData } from './types/projects'
import { EducationBlockData } from './types/education'
import { AppSettings } from './types/settings'
import { Skills, SkillBlock } from './types/skills'

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
    | ExperienceBulletChangeData // upsert_bullets, delete_bullets, toggle_bullet_lock, toggle_bullets_lock_all
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface ProjectChange {
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
    | ProjectBlockData // upsert
    | { id: string; position: number }[] // reorder
    | { id: string } // delete
    | ProjectBulletChangeData // upsert_bullets, delete_bullets, toggle_bullet_lock, toggle_bullets_lock_all
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface ExperienceBulletChangeData {
  experienceId: string
  data?: BulletPoint[]
  bulletIds?: string[]
}

interface ProjectBulletChangeData {
  projectId: string
  data?: BulletPoint[]
  bulletIds?: string[]
}

interface EducationChange {
  id: number
  operation: 'upsert' | 'delete' | 'reorder'
  value:
    | EducationBlockData // upsert
    | { id: string; position: number }[] // reorder
    | { id: string } // delete
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface SettingsChange {
  id: number
  operation: 'update'
  value: AppSettings
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface SkillsChange {
  id: number
  operation: 'update_skills'
  value: Skills
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
}

interface ResumeSkillsChange {
  id: number
  operation:
    | 'update_resume_skills'
    | 'delete_resume_skills'
    | 'reorder_resume_skills'
  value:
    | SkillBlock // update_resume_skills
    | { id: string }[] // delete_resume_skills
    | { id: string; position: number }[] // reorder_resume_skills
  write_id: string
  timestamp: string
  synced: boolean
  user_id: string | null
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
  projects: {
    datasetName: 'projects',
    getLatestUnsyncedQuery: selectAllUnsyncedProjectChangesQuery,
    markSyncedQuery: updateProjectChangelogQuery,
    cleanupQuery: cleanUpSyncedProjectChangelogEntriesQuery,
    syncToRemote: syncProjectsToRemote,
    syncMode: 'batch',
  } as SyncConfig<ProjectChange>,
  education: {
    datasetName: 'education',
    getLatestUnsyncedQuery: selectAllUnsyncedEducationChangesQuery,
    markSyncedQuery: updateEducationChangelogQuery,
    cleanupQuery: cleanUpSyncedEducationChangelogEntriesQuery,
    syncToRemote: syncEducationToRemote,
    syncMode: 'batch',
  } as SyncConfig<EducationChange>,
  settings: {
    datasetName: 'app_settings',
    getLatestUnsyncedQuery: selectLatestUnsyncedSettingsChangeQuery,
    markSyncedQuery: updateSettingsChangelogQuery,
    markPreviousAsSyncedQuery: markPreviousSettingsChangesAsSyncedQuery,
    cleanupQuery: cleanUpSyncedSettingsChangelogEntriesQuery,
    syncToRemote: syncSettingsToRemote,
    syncMode: 'single',
  } as SyncConfig<SettingsChange>,
  skills: {
    datasetName: 'skills',
    getLatestUnsyncedQuery: selectLatestUnsyncedSkillsChangeQuery,
    markSyncedQuery: updateSkillsChangelogQuery,
    markPreviousAsSyncedQuery: markPreviousSkillsChangesAsSyncedQuery,
    cleanupQuery: cleanUpSyncedSkillsChangelogEntriesQuery,
    syncToRemote: syncSkillsToRemote,
    syncMode: 'single',
  } as SyncConfig<SkillsChange>,
  resume_skills: {
    datasetName: 'resume_skills',
    getLatestUnsyncedQuery: selectAllUnsyncedResumeSkillsChangesQuery,
    markSyncedQuery: updateResumeSkillsChangelogQuery,
    cleanupQuery: cleanUpSyncedResumeSkillsChangelogEntriesQuery,
    syncToRemote: syncResumeSkillsToRemote,
    syncMode: 'batch',
  } as SyncConfig<ResumeSkillsChange>,
} as const

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

async function syncExperiencePositionsFromRemote(
  db: ElectricDb
): Promise<void> {
  try {
    const { data: remoteExperiences, error } = await supabase
      .from('experience')
      .select('id, position')
      .order('position', { ascending: true })

    if (error) {
      console.error('Failed to fetch remote experience block positions:', error)
      return
    }

    if (!remoteExperiences?.length) return

    const timestamp = nowIso()
    for (const experience of remoteExperiences) {
      await db.query(updateExperiencePositionQuery, [
        experience.id,
        experience.position,
        timestamp,
      ])
    }
  } catch (error) {
    console.error('Error syncing experience positions from remote:', error)
  }
}

async function syncExperienceBulletPositionsFromRemote(
  db: ElectricDb,
  experienceId: string
): Promise<void> {
  try {
    const { data: remoteBullets, error } = await supabase
      .from('experience_bullets')
      .select('id, position')
      .eq('experience_id', experienceId)
      .order('position', { ascending: true })

    if (error) {
      console.error(
        'Failed to fetch remote experience bullet positions:',
        error
      )
      return
    }

    if (!remoteBullets?.length) return

    const timestamp = nowIso()
    for (const bullet of remoteBullets) {
      await db.query(updateExperienceBulletPositionQuery, [
        bullet.id,
        bullet.position,
        timestamp,
      ])
    }
  } catch (error) {
    console.error(
      'Error syncing experience bullet positions from remote:',
      error
    )
  }
}

async function syncProjectsPositionsFromRemote(db: ElectricDb): Promise<void> {
  try {
    const { data: remoteProjects, error } = await supabase
      .from('projects')
      .select('id, position')
      .order('position', { ascending: true })

    if (error) {
      console.error('Failed to fetch remote project block positions:', error)
      return
    }

    if (!remoteProjects?.length) return

    const timestamp = nowIso()
    for (const project of remoteProjects) {
      await db.query(updateProjectPositionQuery, [
        project.id,
        project.position,
        timestamp,
      ])
    }
  } catch (error) {
    console.error('Error syncing project positions from remote:', error)
  }
}

async function syncProjectBulletPositionsFromRemote(
  db: ElectricDb,
  projectId: string
): Promise<void> {
  try {
    const { data: remoteBullets, error } = await supabase
      .from('project_bullets')
      .select('id, position')
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Failed to fetch remote project bullet positions:', error)
      return
    }

    if (!remoteBullets?.length) return

    const timestamp = nowIso()
    for (const bullet of remoteBullets) {
      await db.query(updateProjectBulletPositionQuery, [
        bullet.id,
        bullet.position,
        timestamp,
      ])
    }
  } catch (error) {
    console.error('Error syncing project bullet positions from remote:', error)
  }
}

async function syncEducationPositionsFromRemote(db: ElectricDb): Promise<void> {
  try {
    const { data: remoteEducation, error } = await supabase
      .from('education')
      .select('id, position')
      .order('position', { ascending: true })

    if (error) {
      console.error('Failed to fetch remote education block positions:', error)
      return
    }

    if (!remoteEducation?.length) return

    const timestamp = nowIso()
    for (const education of remoteEducation) {
      await db.query(updateEducationPositionQuery, [
        education.id,
        education.position,
        timestamp,
      ])
    }
  } catch (error) {
    console.error('Error syncing education positions from remote:', error)
  }
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
        // Record doesn't exist, proceed with upsert
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

      await syncExperiencePositionsFromRemote(db)

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

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id } = change.value as { id: string }

      const { error: serverError } = await supabase
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

      const { error } = await supabase.rpc('delete_experience', {
        e_ids: [id],
      })

      if (error) throw error

      await syncExperiencePositionsFromRemote(db)

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
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
): Promise<void> => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const changeData = change.value as ExperienceBulletChangeData
    const bulletsToUpsert = changeData.data || []
    const experienceId = changeData.experienceId

    try {
      const safeBullets: BulletPoint[] = []

      for (const bullet of bulletsToUpsert) {
        const { data: serverData, error: serverError } = await supabase
          .from('experience_bullets')
          .select('updated_at')
          .eq('id', bullet.id)
          .eq('experience_id', experienceId)
          .maybeSingle()

        if (isRecordNotFoundError(serverError)) {
          // Bullet doesn't exist on server, safe to sync
          safeBullets.push(bullet)
          continue
        } else if (serverError) {
          throw serverError
        }

        if (serverData?.updated_at) {
          const serverTime = new Date(serverData.updated_at).getTime()
          const localTime = new Date(change.timestamp || 0).getTime()
          const timeDiff = serverTime - localTime

          if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
            // Server has newer data for this bullet, skip
            continue
          }
        }

        // No conflict, safe to sync
        safeBullets.push(bullet)
      }

      if (safeBullets.length > 0) {
        const bulletsWithExperienceId = safeBullets.map((bullet) => ({
          ...bullet,
          experienceId,
        }))

        const { error } = await supabase.rpc('upsert_experience_bullets', {
          bullets: bulletsWithExperienceId,
        })

        if (error) throw error

        // Sync bullet positions from remote after upsert (triggers may have reordered)
        await syncExperienceBulletPositionsFromRemote(db, experienceId)
      }

      // Mark change as synced even if some bullets were skipped
      await db.query(config.markSyncedQuery, [true, change.write_id])
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

const deleteExperienceBullets = async (
  change: ExperienceChange,
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const changeData = change.value as ExperienceBulletChangeData
      const bulletsToDelete = changeData.bulletIds || []
      const experienceId = changeData.experienceId

      if (!bulletsToDelete.length) {
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      }

      const { error: serverError } = await supabase.rpc(
        'delete_experience_bullets',
        {
          b_ids: bulletsToDelete,
        }
      )

      if (serverError) throw serverError

      await syncExperienceBulletPositionsFromRemote(db, experienceId)

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

const toggleExperienceBullets = async (
  change: ExperienceChange,
  db: ElectricDb,
  config: SyncConfig<ExperienceChange>
) => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const changeData = change.value as ExperienceBulletChangeData
      const bulletsToUpdate = changeData.data || []
      const experienceId = changeData.experienceId

      if (bulletsToUpdate.length === 0) {
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      }

      const safeBullets: BulletPoint[] = []

      for (const bullet of bulletsToUpdate) {
        const { data: serverData, error: serverError } = await supabase
          .from('experience_bullets')
          .select('updated_at, is_locked')
          .eq('id', bullet.id)
          .eq('experience_id', experienceId)
          .maybeSingle()

        if (isRecordNotFoundError(serverError)) {
          // Bullet doesn't exist on server, skip
          continue
        } else if (serverError) {
          throw serverError
        }

        if (serverData?.updated_at) {
          const serverTime = new Date(serverData.updated_at).getTime()
          const localTime = new Date(change.timestamp || 0).getTime()
          const timeDiff = serverTime - localTime

          if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
            // Server has newer data, skip this bullet
            continue
          }
        }

        safeBullets.push(bullet)
      }

      if (safeBullets.length === 0) {
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      }

      const { error } = await supabase.rpc('update_experience_bullet_locks', {
        bullet_ids: safeBullets.map((b) => b.id),
        bullet_locks: safeBullets.map((b) => b.isLocked ?? false),
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
    case 'delete_bullets':
      await deleteExperienceBullets(change, db, config)
      break
    case 'toggle_bullet_lock':
    case 'toggle_bullets_lock_all':
      await toggleExperienceBullets(change, db, config)
      break
  }
}

const upsertProject = async (
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
): Promise<void> => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const projectBlock = change.value as ProjectBlockData

      const { data: serverData, error: serverError } = await supabase
        .from('projects')
        .select('updated_at')
        .eq('id', projectBlock.id)
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

      const { error } = await supabase.rpc('upsert_project', {
        p_id: projectBlock.id,
        p_title: projectBlock.title,
        p_link: projectBlock.link,
        p_technologies: projectBlock.technologies,
        p_description: projectBlock.description || '',
        p_start_month: projectBlock.startDate.month ?? '',
        p_start_year: Number(projectBlock.startDate.year),
        p_end_month: projectBlock.endDate.month ?? '',
        p_end_year: Number(projectBlock.endDate.year),
        p_is_present: projectBlock.endDate.isPresent,
        p_is_included: projectBlock.isIncluded ?? true,
        p_position: projectBlock.position ?? 0,
      })

      if (error) throw error

      await syncProjectsPositionsFromRemote(db)

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

const deleteProject = async (
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id } = change.value as { id: string }

      const { error: serverError } = await supabase
        .from('projects')
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

      const { error } = await supabase.rpc('delete_project', {
        p_ids: [id],
      })

      if (error) throw error

      await syncProjectsPositionsFromRemote(db)

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

const reorderProjects = async (
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      for (const row of change.value as { id: string; position: number }[]) {
        const { error: serverError } = await supabase
          .from('projects')
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

const upsertProjectBullets = async (
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
): Promise<void> => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const changeData = change.value as ProjectBulletChangeData
    const bulletsToUpsert = changeData.data || []
    const projectId = changeData.projectId

    try {
      const safeBullets: BulletPoint[] = []

      for (const bullet of bulletsToUpsert) {
        const { data: serverData, error: serverError } = await supabase
          .from('project_bullets')
          .select('updated_at')
          .eq('id', bullet.id)
          .eq('project_id', projectId)
          .maybeSingle()

        if (isRecordNotFoundError(serverError)) {
          // Bullet doesn't exist on server, safe to sync
          safeBullets.push(bullet)
          continue
        } else if (serverError) {
          throw serverError
        }

        if (serverData?.updated_at) {
          const serverTime = new Date(serverData.updated_at).getTime()
          const localTime = new Date(change.timestamp || 0).getTime()
          const timeDiff = serverTime - localTime

          if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
            // Server has newer data for this bullet, skip
            continue
          }
        }

        // No conflict, safe to sync
        safeBullets.push(bullet)
      }

      if (safeBullets.length > 0) {
        const bulletsWithProjectId = safeBullets.map((bullet) => ({
          ...bullet,
          projectId,
        }))

        const { error } = await supabase.rpc('upsert_project_bullets', {
          bullets: bulletsWithProjectId,
        })

        if (error) throw error

        // Sync bullet positions from remote after upsert (triggers may have reordered)
        await syncProjectBulletPositionsFromRemote(db, projectId)
      }

      // Mark change as synced even if some bullets were skipped
      await db.query(config.markSyncedQuery, [true, change.write_id])
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      )
    }
  }
}

const deleteProjectBullets = async (
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const changeData = change.value as ProjectBulletChangeData
      const bulletsToDelete = changeData.bulletIds || []
      const projectId = changeData.projectId

      if (!bulletsToDelete.length) {
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      }

      const { error: serverError } = await supabase.rpc(
        'delete_project_bullets',
        {
          b_ids: bulletsToDelete,
        }
      )

      if (serverError) throw serverError

      await syncProjectBulletPositionsFromRemote(db, projectId)

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

const toggleProjectBullets = async (
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
) => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const changeData = change.value as ProjectBulletChangeData
      const bulletsToUpdate = changeData.data || []
      const projectId = changeData.projectId

      if (bulletsToUpdate.length === 0) {
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      }

      const safeBullets: BulletPoint[] = []

      for (const bullet of bulletsToUpdate) {
        const { data: serverData, error: serverError } = await supabase
          .from('project_bullets')
          .select('updated_at, is_locked')
          .eq('id', bullet.id)
          .eq('project_id', projectId)
          .maybeSingle()

        if (isRecordNotFoundError(serverError)) {
          // Bullet doesn't exist on server, skip
          continue
        } else if (serverError) {
          throw serverError
        }

        if (serverData?.updated_at) {
          const serverTime = new Date(serverData.updated_at).getTime()
          const localTime = new Date(change.timestamp || 0).getTime()
          const timeDiff = serverTime - localTime

          if (serverTime > localTime && timeDiff > TOLERANCE_MS) {
            // Server has newer data, skip this bullet
            continue
          }
        }

        safeBullets.push(bullet)
      }

      if (safeBullets.length === 0) {
        await db.query(config.markSyncedQuery, [true, change.write_id])
        return
      }

      const { error } = await supabase.rpc('update_project_bullet_locks', {
        bullet_ids: safeBullets.map((b) => b.id),
        bullet_locks: safeBullets.map((b) => b.isLocked ?? false),
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

async function syncProjectsToRemote(
  change: ProjectChange,
  db: ElectricDb,
  config: SyncConfig<ProjectChange>
) {
  switch (change.operation) {
    case 'upsert':
      await upsertProject(change, db, config)
      break
    case 'delete':
      await deleteProject(change, db, config)
      break
    case 'reorder':
      await reorderProjects(change, db, config)
      break
    case 'upsert_bullets':
      await upsertProjectBullets(change, db, config)
      break
    case 'delete_bullets':
      await deleteProjectBullets(change, db, config)
      break
    case 'toggle_bullet_lock':
    case 'toggle_bullets_lock_all':
      await toggleProjectBullets(change, db, config)
      break
  }
}

const upsertEducation = async (
  change: EducationChange,
  db: ElectricDb,
  config: SyncConfig<EducationChange>
): Promise<void> => {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const educationBlock = change.value as EducationBlockData

      const { data: serverData, error: serverError } = await supabase
        .from('education')
        .select('updated_at')
        .eq('id', educationBlock.id)
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

      const { error } = await supabase.rpc('upsert_education', {
        e_id: educationBlock.id,
        e_institution: educationBlock.institution,
        e_degree: educationBlock.degree,
        e_degree_status: educationBlock.degreeStatus || '',
        e_location: educationBlock.location || '',
        e_description: educationBlock.description || '',
        e_start_month: educationBlock.startDate?.month ?? '',
        e_start_year: Number(educationBlock.startDate?.year),
        e_end_month: educationBlock.endDate?.month ?? '',
        e_end_year: Number(educationBlock.endDate?.year),
        e_is_included: educationBlock.isIncluded ?? true,
        e_position: educationBlock.position ?? 0,
      })

      if (error) throw error

      await syncEducationPositionsFromRemote(db)

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

const deleteEducation = async (
  change: EducationChange,
  db: ElectricDb,
  config: SyncConfig<EducationChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id } = change.value as { id: string }

      const { error: serverError } = await supabase
        .from('education')
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

      const { error } = await supabase.rpc('delete_education', {
        e_ids: [id],
      })

      if (error) throw error

      await syncEducationPositionsFromRemote(db)

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

const reorderEducation = async (
  change: EducationChange,
  db: ElectricDb,
  config: SyncConfig<EducationChange>
): Promise<void> => {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      for (const row of change.value as { id: string; position: number }[]) {
        const { error: serverError } = await supabase
          .from('education')
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

async function syncEducationToRemote(
  change: EducationChange,
  db: ElectricDb,
  config: SyncConfig<EducationChange>
) {
  switch (change.operation) {
    case 'upsert':
      await upsertEducation(change, db, config)
      break
    case 'delete':
      await deleteEducation(change, db, config)
      break
    case 'reorder':
      await reorderEducation(change, db, config)
      break
  }
}

async function upsertSettings(
  change: SettingsChange,
  db: ElectricDb,
  config: SyncConfig<SettingsChange>
) {
  const maxRetries = 3
  const TOLERANCE_MS = 5000 // Reduced for settings - rapid changes are common

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const settings = change.value as AppSettings

      const { data: serverData, error: serverError } = await supabase
        .from('app_settings')
        .select('updated_at')
        .single()

      if (isRecordNotFoundError(serverError)) {
        // Record doesn't exist, proceed with upsert
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

      const { error } = await supabase.rpc('upsert_settings', {
        s_experience_bullets_per_block: settings.bulletsPerExperienceBlock,
        s_project_bullets_per_block: settings.bulletsPerProjectBlock,
        s_max_chars_per_bullet: settings.maxCharsPerBullet,
        s_language_model: settings.languageModel,
        s_section_order: settings.sectionOrder,
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

async function syncSettingsToRemote(
  change: SettingsChange,
  db: ElectricDb,
  config: SyncConfig<SettingsChange>
) {
  if (change.operation === 'update') {
    await upsertSettings(change, db, config)
    return
  }
}

async function syncSkillsToRemote(
  change: SkillsChange,
  db: ElectricDb,
  config: SyncConfig<SkillsChange>
): Promise<void> {
  const maxRetries = 3
  const TOLERANCE_MS = 30000

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data: serverData, error: serverError } = await supabase
        .from('skills')
        .select('updated_at')
        .maybeSingle()

      if (isRecordNotFoundError(serverError)) {
        // Record doesn't exist, proceed with upsert
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

      const { error } = await supabase.rpc('upsert_skills', {
        s_hard_skills: change.value.hardSkills.skills,
        s_hard_suggestions: change.value.hardSkills.suggestions,
        s_soft_skills: change.value.softSkills.skills,
        s_soft_suggestions: change.value.softSkills.suggestions,
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

async function syncResumeSkillsToRemote(
  change: ResumeSkillsChange,
  db: ElectricDb,
  config: SyncConfig<ResumeSkillsChange>
) {
  switch (change.operation) {
    case 'update_resume_skills':
      //   await upsertResumeSkills(change, db, config)
      break
    case 'delete_resume_skills':
      //   await deleteResumeSkills(change, db, config)
      break
    case 'reorder_resume_skills':
      // await reorderResumeSkills(change, db, config)
      break
  }
}

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

  const projectsConfig = SYNC_CONFIGS.projects
  try {
    await syncDataset(db, user?.id, projectsConfig)
  } catch (error) {
    console.error(`Error syncing projects:`, error)
  }

  const educationConfig = SYNC_CONFIGS.education
  try {
    await syncDataset(db, user?.id, educationConfig)
  } catch (error) {
    console.error(`Error syncing education:`, error)
  }

  const settingsConfig = SYNC_CONFIGS.settings
  try {
    await syncDataset(db, user?.id, settingsConfig)
  } catch (error) {
    console.error(`Error syncing settings:`, error)
  }

  const skillsConfig = SYNC_CONFIGS.skills
  try {
    await syncDataset(db, user?.id, skillsConfig)
  } catch (error) {
    console.error(`Error syncing skills:`, error)
  }

  const resumeSkillsConfig = SYNC_CONFIGS.resume_skills
  try {
    await syncDataset(db, user?.id, resumeSkillsConfig)
  } catch (error) {
    console.error(`Error syncing resume skills:`, error)
  }
}

export { SYNC_CONFIGS }
