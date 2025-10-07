import { settingsSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import { AppSettings, SettingsFormState } from '../types/settings'
import { extractSettingsFormData } from '../utils'

export const submitSettings = async (
  _previousState: SettingsFormState,
  formData: FormData,
  currentSettings: AppSettings
): Promise<SettingsFormState> => {
  const settingsData: AppSettings = extractSettingsFormData(
    formData,
    currentSettings
  )

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
