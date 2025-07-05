import { SETTINGS_FORM_DATA_KEYS } from '@/lib/constants'
import { settingsSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import {
  AppSettings,
  LanguageModel,
  SettingsFormState,
} from '../types/settings'

export const submitSettings = async (
  _previousState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> => {
  const settingsData: AppSettings = {
    bulletsPerExperienceBlock: Number(
      formData.get(
        SETTINGS_FORM_DATA_KEYS.BULLETS_PER_EXPERIENCE_BLOCK
      ) as string
    ),
    bulletsPerProjectBlock: Number(
      formData.get(SETTINGS_FORM_DATA_KEYS.BULLETS_PER_PROJECT_BLOCK) as string
    ),
    maxCharsPerBullet: Number(
      formData.get(SETTINGS_FORM_DATA_KEYS.MAX_CHARS_PER_BULLET) as string
    ),
    languageModel: formData.get(
      SETTINGS_FORM_DATA_KEYS.LANGUAGE_MODEL
    ) as LanguageModel,
  }

  console.log('settingsData', settingsData)

  const validatedData = settingsSchema.safeParse(settingsData)

  if (validatedData.success) {
    return {
      errors: {},
      data: validatedData.data,
    }
  } else {
    return {
      errors: zodErrorsToFormErrors(validatedData.error),
      data: settingsData,
    }
  }
}
