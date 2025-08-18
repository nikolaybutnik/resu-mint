import {
  ExperienceBlockData,
  ExperienceFormState,
  BulletPoint,
} from '../types/experience'
import { experienceBlockSchema } from '../validationSchemas'
import { OperationError, zodErrorsToFormErrors } from '../types/errors'
import { extractExperienceFormData } from '../utils'

export const submitExperience = async (
  prevState: ExperienceFormState,
  formData: FormData,
  currentBulletPoints: BulletPoint[] = [],
  upsert: (block: ExperienceBlockData) => Promise<{
    error: OperationError | null
  }>
): Promise<ExperienceFormState> => {
  const experienceData: ExperienceBlockData = extractExperienceFormData(
    formData,
    {
      isIncluded: prevState.data?.isIncluded,
      bulletPoints: currentBulletPoints,
    }
  )

  const validatedData = experienceBlockSchema.safeParse(experienceData)

  // TODO: implement notifications
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
