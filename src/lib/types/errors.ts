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

export function zodErrorsToApiErrors(
  zodErrors: ZodError['errors']
): ApiError[] {
  return zodErrors.map((error) => ({
    field: error.path.join('.') || 'value',
    message: error.message,
    type: 'validation',
  }))
}

export type BulletPointErrors = {
  bulletEmpty?: string[]
  bulletTooLong?: string[]
}
