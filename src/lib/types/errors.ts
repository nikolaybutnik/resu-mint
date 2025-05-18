export type ErrorType =
  | 'validation'
  | 'missing_data'
  | 'server'
  | 'ai_generation'
  | 'format'
  | 'latex_generation'
  | 'pdf_generation'
  | 'missing_session_id'
  | 'read_pdf'
  | 'resume_generation'
  | 'job_analysis'
  | 'bullet_generation'

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export type ApiError = {
  field: string
  message: string
  type?: ErrorType
}

export type ApiErrorResponse = {
  errors: ApiError[]
  status: ResponseStatus.ERROR
}

export type ApiSuccessResponse<T> = {
  data: T
  status: ResponseStatus.SUCCESS
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function createError(
  field: string,
  message: string,
  type?: ErrorType
): ApiError {
  return { field, message, type }
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

export function zodErrorsToApiErrors(zodErrors: any[]): ApiError[] {
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
