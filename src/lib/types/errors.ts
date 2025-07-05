import { ZodError } from 'zod'

export const ResponseStatus = {
  SUCCESS: 'success',
  ERROR: 'error',
} as const

export type ApiError = {
  field: string
  message: string
}

export type ApiErrorResponse = {
  errors: ApiError[]
  status: (typeof ResponseStatus)[keyof typeof ResponseStatus]
}

export type ApiSuccessResponse<T> = {
  data: T
  status: (typeof ResponseStatus)[keyof typeof ResponseStatus]
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function createError(field: string, message: string): ApiError {
  return { field, message }
}

export function createErrorResponse(errors: ApiError[]): ApiErrorResponse {
  return { errors, status: ResponseStatus.ERROR }
}

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return { data, status: ResponseStatus.SUCCESS }
}

export function formatErrorsForClient(errors: ApiError[]): {
  [key: string]: string
} {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message
    return acc
  }, {} as { [key: string]: string })
}

export const zodErrorsToApiErrors = (
  zodErrors: ZodError['errors']
): ApiError[] => {
  return zodErrors.map((error) => ({
    field: error.path.join('.') || 'value',
    message: error.message,
    type: 'validation',
  }))
}

export const zodErrorsToFormErrors = (
  error: ZodError
): Record<string, string> => {
  return error.errors.reduce((acc, err) => {
    if (err.path.length > 0) {
      acc[err.path[0] as string] = err.message
    }
    return acc
  }, {} as Record<string, string>)
}
