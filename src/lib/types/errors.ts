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
  | 'UNKNOWN_ERROR'

export interface OperationError {
  code: ErrorCode
  message: string
  originalError?: unknown
  retryable?: boolean
}

// ========================================
// RESULT PATTERN
// ========================================

export type Result<T> =
  | { success: true; data: T; warning?: OperationError }
  | { success: false; error: OperationError }

export const Success = <T>(data: T, warning?: OperationError): Result<T> => ({
  success: true,
  data,
  warning,
})

export const Failure = (error: OperationError): Result<never> => ({
  success: false,
  error,
})

// ========================================
// OPERATION ERROR FACTORIES
// ========================================

export const createOperationError = (
  code: ErrorCode,
  message: string,
  originalError?: unknown,
  retryable = false
): OperationError => ({
  code,
  message,
  originalError,
  retryable,
})

export const createNetworkError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('NETWORK_ERROR', message, originalError, true)

export const createStorageError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('STORAGE_ERROR', message, originalError, false)

export const createAuthError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('AUTH_ERROR', message, originalError, false)

export const createValidationError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('VALIDATION_ERROR', message, originalError, false)

export const createQuotaExceededError = (
  originalError?: unknown
): OperationError =>
  createOperationError(
    'QUOTA_EXCEEDED',
    'Storage quota exceeded',
    originalError,
    false
  )

export const createUnknownError = (
  message: string,
  originalError?: unknown
): OperationError =>
  createOperationError('UNKNOWN_ERROR', message, originalError, false)

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
    (typeof err.code === 'string' &&
      ['NETWORK_ERROR', 'ECONNREFUSED', 'ENOTFOUND'].includes(err.code))
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
