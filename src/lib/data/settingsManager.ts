import { AppSettings, RawSettings } from '../types/settings'
import { settingsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  // useAuthStore,
  useDbStore,
} from '@/stores'
import { getSettingsQuery, upsertSettingsQuery } from '../sql'
import {
  createValidationError,
  Failure,
  Result,
  Success,
} from '../types/errors'
// import { v4 as uuidv4 } from 'uuid'
import { createUnknownError } from '../types/errors'
import { nowIso } from './dataUtils'
// import { getLastKnownUserId } from '../utils'

class SettingsManager {
  private translateRawSettings(raw: RawSettings): AppSettings {
    return {
      id: raw.id,
      bulletsPerExperienceBlock: raw.bullets_per_experience_block,
      bulletsPerProjectBlock: raw.bullets_per_project_block,
      maxCharsPerBullet: raw.max_chars_per_bullet,
      languageModel: raw.language_model,
      sectionOrder: raw.section_order,
      updatedAt: raw.updated_at,
    }
  }

  async get(): Promise<AppSettings> {
    const { db } = useDbStore.getState()

    const data = await db?.query<RawSettings>(getSettingsQuery)

    if (!data?.rows?.length) {
      return DEFAULT_STATE_VALUES.SETTINGS
    }

    const [storedData] = data.rows

    return this.translateRawSettings(storedData)
  }

  async save(data: AppSettings): Promise<Result<AppSettings>> {
    const validation = settingsSchema.safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid settings data', validation.error)
      )
    }

    // const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    // const currentUser = useAuthStore.getState().user
    // const userId = currentUser?.id || getLastKnownUserId()

    try {
      await db?.query(upsertSettingsQuery, [
        data.id,
        data.bulletsPerExperienceBlock,
        data.bulletsPerProjectBlock,
        data.maxCharsPerBullet,
        data.languageModel,
        data.sectionOrder,
        timestamp,
      ])

      // await db?.query(insertSettingsChangelogQuery, [
      //   'update',
      //   JSON.stringify(data),
      //   writeId,
      //   timestamp,
      //   userId,
      // ])
    } catch (error) {
      return Failure(createUnknownError('Failed to save settings', error))
    }

    return Success(validation.data)
  }
}

export const settingsManager = new SettingsManager()
