import { EducationBlockData, EducationFormState } from '../types/education'
import { educationBlockSchema } from '../validationSchemas'
import { OperationError, zodErrorsToFormErrors } from '../types/errors'
import { extractEducationFormData } from '../utils'

export const submitEducation = async (
  _prevState: EducationFormState,
  formData: FormData,
  upsert: (block: EducationBlockData) => Promise<{
    error: OperationError | null
  }>
): Promise<EducationFormState> => {
  const educationData: EducationBlockData = extractEducationFormData(formData)

  const validatedData = educationBlockSchema.safeParse(educationData)

  // TODO: implement notifications
  if (validatedData.success) {
    await upsert(validatedData.data)
  }

  return {
    fieldErrors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : educationData,
  }
}
