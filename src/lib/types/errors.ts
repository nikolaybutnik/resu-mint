import type { ZodError } from 'zod'

// ========================================
// FIELD ERRORS (for form validation)
// ========================================

export type FieldErrors = Record<string, string>

export function zodErrorsToFormErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}

  error.errors.forEach((err) => {
    const field = err.path.join('.')
    if (field) {
      fieldErrors[field] = err.message
    }
  })

  return fieldErrors
}

// ========================================
// OPERATION ERRORS (for business logic)
// ========================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'SCHEMA_ERROR'
  | 'UNKNOWN_ERROR'

export interface OperationError {
  code: ErrorCode
  message: string
  originalError?: unknown
}

// ========================================
// RESULT PATTERN
// ========================================

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: OperationError }

export const Success = <T>(data: T): Result<T> => ({
  success: true,
  data,
})

export const Failure = (error: OperationError): Result<never> => ({
  success: false,
  error,
})

// ========================================
// OPERATION ERROR FACTORIES
// ========================================

const createOperationError = (
  code: ErrorCode,
  message: string,
  originalError?: unknown
): OperationError => ({
  code,
  message,
  originalError,
})

export const createNetworkError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('NETWORK_ERROR', message, originalError)

export const createStorageError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('STORAGE_ERROR', message, originalError)

export const createAuthError = (
  message: string,
  originalError?: unknown
): OperationError => createOperationError('AUTH_ERROR', message, originalError)

export const createValidationError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('VALIDATION_ERROR', message, originalError)

export const createQuotaExceededError = (
  originalError?: unknown
): OperationError =>
  createOperationError(
    'QUOTA_EXCEEDED',
    'Storage quota exceeded',
    originalError
  )

export const createUnknownError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('UNKNOWN_ERROR', message, originalError)

export const createSchemaError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('SCHEMA_ERROR', message, originalError)

// ========================================
// ERROR UTILITIES
// ========================================

export const isQuotaExceededError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const err = error as Record<string, unknown>
  return (
    err.name === 'QuotaExceededError' ||
    err.code === 22 ||
    (typeof err.message === 'string' &&
      err.message.toLowerCase().includes('quota'))
  )
}

export const isNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const err = error as Record<string, unknown>
  return (
    (err.name === 'TypeError' &&
      typeof err.message === 'string' &&
      err.message.includes('fetch')) ||
    err.name === 'NetworkError' ||
    (typeof err.code === 'string' &&
      ['NETWORK_ERROR', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(
        err.code
      )) ||
    (typeof err.message === 'string' &&
      (err.message.includes('Failed to fetch') ||
        err.message.includes('Network request failed') ||
        err.message.includes('ERR_NETWORK')))
  )
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiError {
  type: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  errors: ApiError[]
}

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ========================================
// API RESPONSE FACTORIES
// ========================================

export const createError = (type: string, message: string): ApiError => ({
  type,
  message,
})

export const createErrorResponse = (errors: ApiError[]): ApiErrorResponse => ({
  success: false,
  errors,
})

export const createSuccessResponse = <T>(data: T): ApiSuccessResponse<T> => ({
  success: true,
  data,
})

// ========================================
// FORM STATE TYPES
// ========================================

export interface FormStateBase<T> {
  fieldErrors: FieldErrors
  data?: T
  operationError?: OperationError
}
