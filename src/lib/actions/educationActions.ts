import {
  EducationBlockData,
  DegreeStatus,
  Month,
  EducationFormState,
} from '../types/education'
import { educationBlockSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import { EDUCATION_FORM_DATA_KEYS, STORAGE_KEYS } from '../constants'

export const submitEducation = (
  prevState: EducationFormState,
  formData: FormData,
  onComplete: () => void
): EducationFormState => {
  const isLoad = formData.get('load') === 'true'
  const isReset = formData.get('reset') === 'true'

  if (isReset) {
    return {
      errors: {},
      data: undefined,
    }
  }

  if (isLoad) {
    const existingDataString = formData.get('existingData') as string
    if (existingDataString) {
      try {
        const existingData = JSON.parse(
          existingDataString
        ) as EducationBlockData
        return {
          errors: {},
          data: existingData,
        }
      } catch (error) {
        console.error('Error parsing existing data:', error)
      }
    }

    return {
      errors: {},
      data: undefined,
    }
  }

  const educationData: EducationBlockData = {
    id: prevState.data?.id || '',
    isIncluded: prevState.data?.isIncluded || false,
    institution:
      (formData.get(EDUCATION_FORM_DATA_KEYS.INSTITUTION) as string)?.trim() ||
      '',
    degree:
      (formData.get(EDUCATION_FORM_DATA_KEYS.DEGREE) as string)?.trim() || '',
    degreeStatus: (() => {
      const value = formData.get(
        EDUCATION_FORM_DATA_KEYS.DEGREE_STATUS
      ) as string
      return value && value !== '' ? (value as DegreeStatus) : undefined
    })(),
    location:
      (formData.get(EDUCATION_FORM_DATA_KEYS.LOCATION) as string)?.trim() || '',
    startDate: {
      month:
        (formData.get(EDUCATION_FORM_DATA_KEYS.START_DATE_MONTH) as Month) ||
        '',
      year:
        (
          formData.get(EDUCATION_FORM_DATA_KEYS.START_DATE_YEAR) as string
        )?.trim() || '',
    },
    endDate: {
      month:
        (formData.get(EDUCATION_FORM_DATA_KEYS.END_DATE_MONTH) as Month) || '',
      year:
        (
          formData.get(EDUCATION_FORM_DATA_KEYS.END_DATE_YEAR) as string
        )?.trim() || '',
    },
    description:
      (formData.get(EDUCATION_FORM_DATA_KEYS.DESCRIPTION) as string)?.trim() ||
      '',
  }

  const validatedData = educationBlockSchema.safeParse(educationData)

  if (validatedData.success) {
    localStorage.setItem(
      STORAGE_KEYS.EDUCATION,
      JSON.stringify([validatedData.data])
    )
    onComplete()
  }

  return {
    errors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success
      ? (validatedData.data as EducationBlockData)
      : (educationData as Partial<EducationBlockData>),
  }
}
