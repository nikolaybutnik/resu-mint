import {
  ExperienceBlockData,
  ExperienceFormState,
  BulletPoint,
} from '../types/experience'
import { experienceBlockSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import { extractExperienceFormData } from '../utils'

export const submitExperience = (
  prevState: ExperienceFormState,
  formData: FormData,
  workExperience: ExperienceBlockData[],
  currentBulletPoints: BulletPoint[] = [],
  onSave: (data: ExperienceBlockData[]) => void
): ExperienceFormState => {
  const experienceData: ExperienceBlockData = extractExperienceFormData(
    formData,
    {
      isIncluded: prevState.data?.isIncluded,
      bulletPoints: currentBulletPoints,
    }
  )

  const validatedData = experienceBlockSchema.safeParse(experienceData)

  if (validatedData.success) {
    const existingItemIndex = workExperience.findIndex(
      (item) => item.id === validatedData.data.id
    )

    let updatedWorkExperience: ExperienceBlockData[]

    if (existingItemIndex !== -1) {
      updatedWorkExperience = workExperience.map((item) =>
        item.id === validatedData.data.id ? validatedData.data : item
      )
    } else {
      updatedWorkExperience = [...workExperience, validatedData.data]
    }

    onSave(updatedWorkExperience)
  }

  return {
    fieldErrors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : experienceData,
  }
}
