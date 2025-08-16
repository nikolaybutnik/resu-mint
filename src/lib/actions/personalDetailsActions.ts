import { personalDetailsSchema } from '../validationSchemas'
import { zodErrorsToFormErrors, FormStateBase } from '../types/errors'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { extractPersonalDetailsFormData } from '../utils'

export type PersonalDetailsFormState = FormStateBase<PersonalDetailsType>

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
