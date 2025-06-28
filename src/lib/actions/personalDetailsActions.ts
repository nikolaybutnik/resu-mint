import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'
import { personalDetailsSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import {
  PersonalDetails as PersonalDetailsType,
  PersonalDetailsFormState,
} from '@/lib/types/personalDetails'

export const submitPersonalDetails = (
  _previousState: PersonalDetailsFormState,
  formData: FormData,
  onSubmit: (data: PersonalDetailsType) => void
): PersonalDetailsFormState => {
  const personalDetailsData: PersonalDetailsType = {
    name:
      (formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.NAME) as string)?.trim() ||
      '',
    email:
      (formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.EMAIL) as string)?.trim() ||
      '',
    phone:
      (formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.PHONE) as string)?.trim() ||
      '',
    location:
      (
        formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.LOCATION) as string
      )?.trim() || '',
    linkedin:
      (
        formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.LINKEDIN) as string
      )?.trim() || '',
    github:
      (
        formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.GITHUB) as string
      )?.trim() || '',
    website:
      (
        formData.get(PERSONAL_DETAILS_FORM_DATA_KEYS.WEBSITE) as string
      )?.trim() || '',
  }

  const validatedData = personalDetailsSchema.safeParse(personalDetailsData)

  if (validatedData.success) {
    onSubmit(validatedData.data)
    return {
      errors: {},
      data: validatedData.data,
    }
  } else {
    return {
      errors: zodErrorsToFormErrors(validatedData.error),
      data: personalDetailsData,
    }
  }
}
