import { LOGIN_FORM_DATA_KEYS, ROUTES } from '../constants'
import { zodErrorsToFormErrors } from '../types/errors'
import { loginSchema, signupSchema } from '../validationSchemas'
import { redirect } from 'next/navigation'

export const login = async (
  formData: FormData,
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: string | null
  }>
) => {
  const loginFormData = {
    email: (formData.get(LOGIN_FORM_DATA_KEYS.EMAIL) as string)?.trim() || '',
    password:
      (formData.get(LOGIN_FORM_DATA_KEYS.PASSWORD) as string)?.trim() || '',
  }

  const validatedData = loginSchema.safeParse(loginFormData)

  if (validatedData.success) {
    const { error } = await signIn(loginFormData.email, loginFormData.password)

    if (!error) {
      redirect(ROUTES.HOME)
    }

    return {
      errors: { general: error },
      data: loginFormData,
    }
  }

  return {
    errors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: loginFormData,
  }
}

export const signup = async (
  formData: FormData,
  signUp: (
    email: string,
    password: string
  ) => Promise<{
    error: string | null
  }>
) => {
  const signupFormData = {
    email: (formData.get(LOGIN_FORM_DATA_KEYS.EMAIL) as string)?.trim() || '',
    password:
      (formData.get(LOGIN_FORM_DATA_KEYS.PASSWORD) as string)?.trim() || '',
    confirmPassword:
      (formData.get(LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD) as string)?.trim() ||
      '',
  }

  const validatedData = signupSchema.safeParse(signupFormData)

  if (validatedData.success) {
    const { error } = await signUp(
      signupFormData.email,
      signupFormData.password
    )
    if (!error) {
      redirect(ROUTES.HOME)
    }
    return {
      errors: { general: error },
      data: signupFormData,
    }
  }

  return {
    errors: validatedData.success
      ? {}
      : zodErrorsToFormErrors(validatedData.error),
    data: signupFormData,
  }
}
