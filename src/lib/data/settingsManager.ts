import { AppSettings, RawSettings, ResumeSection } from '../types/settings'
import { settingsSchema, sectionOrderSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  // useAuthStore,
  useDbStore,
} from '@/stores'
import {
  getSettingsQuery,
  upsertSettingsQuery,
  updateSectionOrderQuery,
} from '../sql'
import {
  createValidationError,
  Failure,
  Result,
  Success,
} from '../types/errors'
import { v4 as uuidv4 } from 'uuid'
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
    // Ensure ID exists
    const dataWithId = {
      ...data,
      id: data.id || uuidv4(),
    }

    const validation = settingsSchema.safeParse(dataWithId)

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
        validation.data.id,
        validation.data.bulletsPerExperienceBlock,
        validation.data.bulletsPerProjectBlock,
        validation.data.maxCharsPerBullet,
        validation.data.languageModel,
        validation.data.sectionOrder,
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

  async saveSectionOrder(
    id: string,
    sectionOrder: ResumeSection[]
  ): Promise<Result<AppSettings>> {
    const validation = sectionOrderSchema.safeParse(sectionOrder)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid section order', validation.error)
      )
    }

    // const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    // const currentUser = useAuthStore.getState().user
    // const userId = currentUser?.id || getLastKnownUserId()

    try {
      await db?.query(updateSectionOrderQuery, [validation.data, timestamp, id])

      const updatedSettings = await this.get()

      // await db?.query(insertSettingsChangelogQuery, [
      //   'update',
      //   JSON.stringify(updatedSettings),
      //   writeId,
      //   timestamp,
      //   userId,
      // ])

      return Success(updatedSettings)
    } catch (error) {
      return Failure(createUnknownError('Failed to save section order', error))
    }
  }
}

export const settingsManager = new SettingsManager()
