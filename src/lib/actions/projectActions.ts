import {
  ProjectBlockData,
  ProjectFormState,
  Month,
  BulletPoint,
} from '../types/projects'
import { PROJECT_FORM_DATA_KEYS } from '../constants'
import { projectBlockSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'

export const submitProject = (
  prevState: ProjectFormState,
  formData: FormData,
  onSave: (data: ProjectBlockData) => void,
  currentBulletPoints: BulletPoint[] = []
) => {
  const projectData: ProjectBlockData = {
    id: prevState.data?.id || '',
    isIncluded: prevState.data?.isIncluded || false,
    bulletPoints: currentBulletPoints,
    title: (formData.get(PROJECT_FORM_DATA_KEYS.TITLE) as string)?.trim() || '',
    link: (formData.get(PROJECT_FORM_DATA_KEYS.LINK) as string)?.trim() || '',
    technologies:
      (formData.get(PROJECT_FORM_DATA_KEYS.TECHNOLOGIES) as string)?.split(
        ','
      ) || [],
    startDate: {
      month:
        (formData.get(PROJECT_FORM_DATA_KEYS.START_DATE_MONTH) as Month) || '',
      year:
        (
          formData.get(PROJECT_FORM_DATA_KEYS.START_DATE_YEAR) as string
        )?.trim() || '',
    },
    endDate: {
      month:
        (formData.get(PROJECT_FORM_DATA_KEYS.END_DATE_MONTH) as Month) || '',
      year:
        (
          formData.get(PROJECT_FORM_DATA_KEYS.END_DATE_YEAR) as string
        )?.trim() || '',
      isPresent: !!formData.get(PROJECT_FORM_DATA_KEYS.END_DATE_IS_PRESENT),
    },
    description:
      (formData.get(PROJECT_FORM_DATA_KEYS.DESCRIPTION) as string)?.trim() ||
      '',
  }

  console.log('projectData', projectData)

  const validatedData = projectBlockSchema.safeParse(projectData)

  if (validatedData.success) {
    onSave(validatedData.data as ProjectBlockData)
  }

  return {
    errors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : projectData,
  }
}
