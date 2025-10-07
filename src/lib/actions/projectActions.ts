import { ProjectBlockData, ProjectFormState } from '../types/projects'
import { projectBlockSchema } from '../validationSchemas'
import { OperationError, zodErrorsToFormErrors } from '../types/errors'
import { extractProjectFormData } from '../utils'

export const submitProject = async (
  _prevState: ProjectFormState,
  formData: FormData,
  upsert: (block: ProjectBlockData) => Promise<{
    error: OperationError | null
  }>
): Promise<ProjectFormState> => {
  const projectData: ProjectBlockData = extractProjectFormData(formData)

  const validatedData = projectBlockSchema.safeParse(projectData)

  if (validatedData.success) {
    await upsert(validatedData.data)
  }

  return {
    fieldErrors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: validatedData.success ? validatedData.data : projectData,
  }
}
