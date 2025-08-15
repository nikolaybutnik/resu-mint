import { personalDetailsSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import {
  PersonalDetails as PersonalDetailsType,
  PersonalDetailsFormState,
} from '@/lib/types/personalDetails'
import { extractPersonalDetailsFormData } from '../utils'

export const submitPersonalDetails = async (
  _previousState: PersonalDetailsFormState,
  formData: FormData
): Promise<PersonalDetailsFormState> => {
  const personalDetailsData: PersonalDetailsType =
    extractPersonalDetailsFormData(formData)

  const validatedData = personalDetailsSchema.safeParse(personalDetailsData)

  if (validatedData.success) {
    return {
      fieldErrors: {},
      data: validatedData.data,
    }
  } else {
    return {
      fieldErrors: zodErrorsToFormErrors(validatedData.error),
      data: personalDetailsData,
    }
  }
}
