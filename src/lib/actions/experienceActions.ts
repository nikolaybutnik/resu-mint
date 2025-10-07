import { ExperienceBlockData, ExperienceFormState } from '../types/experience'
import { experienceBlockSchema } from '../validationSchemas'
import { OperationError, zodErrorsToFormErrors } from '../types/errors'
import { extractExperienceFormData } from '../utils'

export const submitExperience = async (
  _prevState: ExperienceFormState,
  formData: FormData,
  upsert: (block: ExperienceBlockData) => Promise<{
    error: OperationError | null
  }>
): Promise<ExperienceFormState> => {
  const experienceData: ExperienceBlockData =
    extractExperienceFormData(formData)

  const validatedData = experienceBlockSchema.safeParse(experienceData)

  if (validatedData.success) {
    await upsert(validatedData.data)
  }

  return {
    fieldErrors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : experienceData,
  }
}
