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
  education: EducationBlockData[],
  onSave: (data: EducationBlockData[]) => void
): EducationFormState => {
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
    const existingItemIndex = education.findIndex(
      (item) => item.id === validatedData.data.id
    )

    let updatedEducation: EducationBlockData[]

    if (existingItemIndex !== -1) {
      updatedEducation = education.map((item) =>
        item.id === validatedData.data.id ? validatedData.data : item
      )
    } else {
      updatedEducation = [...education, validatedData.data]
    }

    onSave(updatedEducation)
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
