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
  projects: ProjectBlockData[],
  currentBulletPoints: BulletPoint[] = [],
  onSave: (updatedProjects: ProjectBlockData[]) => void
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

  const validatedData = projectBlockSchema.safeParse(projectData)

  if (validatedData.success) {
    const existingItemIndex = projects.findIndex(
      (item) => item.id === validatedData.data.id
    )

    let updatedProjects: ProjectBlockData[]

    if (existingItemIndex !== -1) {
      updatedProjects = projects.map((item) =>
        item.id === validatedData.data.id ? validatedData.data : item
      )
    } else {
      updatedProjects = [...projects, validatedData.data]
    }

    onSave(updatedProjects)
  }

  return {
    errors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : projectData,
  }
}
