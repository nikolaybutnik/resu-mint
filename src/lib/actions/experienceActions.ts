import {
  ExperienceBlockData,
  ExperienceFormState,
  Month,
  BulletPoint,
} from '../types/experience'
import { EXPERIENCE_FORM_DATA_KEYS } from '../constants'
import { experienceBlockSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'

export const submitExperience = (
  prevState: ExperienceFormState,
  formData: FormData,
  onSave: (data: ExperienceBlockData) => void,
  currentBulletPoints: BulletPoint[] = []
) => {
  const experienceData: ExperienceBlockData = {
    id: prevState.data?.id || '',
    isIncluded: prevState.data?.isIncluded || false,
    bulletPoints: currentBulletPoints,
    title:
      (formData.get(EXPERIENCE_FORM_DATA_KEYS.TITLE) as string)?.trim() || '',
    companyName:
      (
        formData.get(EXPERIENCE_FORM_DATA_KEYS.COMPANY_NAME) as string
      )?.trim() || '',
    location:
      (formData.get(EXPERIENCE_FORM_DATA_KEYS.LOCATION) as string)?.trim() ||
      '',
    startDate: {
      month:
        (formData.get(EXPERIENCE_FORM_DATA_KEYS.START_DATE_MONTH) as Month) ||
        '',
      year:
        (
          formData.get(EXPERIENCE_FORM_DATA_KEYS.START_DATE_YEAR) as string
        )?.trim() || '',
    },
    endDate: {
      month:
        (formData.get(EXPERIENCE_FORM_DATA_KEYS.END_DATE_MONTH) as Month) || '',
      year:
        (
          formData.get(EXPERIENCE_FORM_DATA_KEYS.END_DATE_YEAR) as string
        )?.trim() || '',
      isPresent: !!formData.get(EXPERIENCE_FORM_DATA_KEYS.END_DATE_IS_PRESENT),
    },
    description:
      (formData.get(EXPERIENCE_FORM_DATA_KEYS.DESCRIPTION) as string)?.trim() ||
      '',
  }

  const validatedData = experienceBlockSchema.safeParse(experienceData)

  if (validatedData.success) {
    onSave(validatedData.data as ExperienceBlockData)
  }

  return {
    errors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : experienceData,
  }
}
