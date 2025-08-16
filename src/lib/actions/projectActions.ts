import {
  ProjectBlockData,
  ProjectFormState,
  BulletPoint,
} from '../types/projects'
import { projectBlockSchema } from '../validationSchemas'
import { zodErrorsToFormErrors } from '../types/errors'
import { extractProjectFormData } from '../utils'

export const submitProject = (
  prevState: ProjectFormState,
  formData: FormData,
  projects: ProjectBlockData[],
  currentBulletPoints: BulletPoint[] = [],
  onSave: (updatedProjects: ProjectBlockData[]) => void
) => {
  const projectData: ProjectBlockData = extractProjectFormData(formData, {
    isIncluded: prevState.data?.isIncluded,
    bulletPoints: currentBulletPoints,
  })

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
