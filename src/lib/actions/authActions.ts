import { LOGIN_FORM_DATA_KEYS, ROUTES } from '../constants'
import { zodErrorsToFormErrors } from '../types/errors'
import {
  loginSchema,
  signupSchema,
  resetPasswordSchema,
} from '../validationSchemas'
import { redirect } from 'next/navigation'
import { supabase } from '../supabase/client'
import type { AuthFormState } from '../types/auth'
import { updatePasswordSchema } from '../validationSchemas'

export const login = async (
  formData: FormData,
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
): Promise<AuthFormState> => {
  const loginFormData = {
    email: (formData.get(LOGIN_FORM_DATA_KEYS.EMAIL) as string)?.trim() || '',
    password:
      (formData.get(LOGIN_FORM_DATA_KEYS.PASSWORD) as string)?.trim() || '',
  }

  const validatedData = loginSchema.safeParse(loginFormData)

  if (!validatedData.success) {
    return {
      formErrors: zodErrorsToFormErrors(validatedData.error),
      data: loginFormData,
    }
  }

  const { error } = await signIn(loginFormData.email, loginFormData.password)

  if (!error) {
    redirect(ROUTES.HOME)
  }

  return {
    formErrors: {},
    data: loginFormData,
  }
}

export const signup = async (
  formData: FormData,
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
): Promise<AuthFormState> => {
  const signupFormData = {
    email: (formData.get(LOGIN_FORM_DATA_KEYS.EMAIL) as string)?.trim() || '',
    password:
      (formData.get(LOGIN_FORM_DATA_KEYS.PASSWORD) as string)?.trim() || '',
    confirmPassword:
      (formData.get(LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD) as string)?.trim() ||
      '',
  }

  const validatedData = signupSchema.safeParse(signupFormData)

  if (!validatedData.success) {
    return {
      formErrors: zodErrorsToFormErrors(validatedData.error),
      data: signupFormData,
    }
  }

  const { error } = await signUp(signupFormData.email, signupFormData.password)

  if (!error) {
    redirect(ROUTES.HOME)
  }

  return {
    formErrors: {},
    data: signupFormData,
  }
}

export const resetPassword = async (
  formData: FormData
): Promise<AuthFormState> => {
  const resetFormData = {
    email: (formData.get(LOGIN_FORM_DATA_KEYS.EMAIL) as string)?.trim() || '',
  }

  const validatedData = resetPasswordSchema.safeParse(resetFormData)

  if (!validatedData.success) {
    return {
      formErrors: zodErrorsToFormErrors(validatedData.error),
      data: { email: resetFormData.email, password: '' },
    }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    resetFormData.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}${ROUTES.RESET_PASSWORD}`,
    }
  )

  if (error) {
    return {
      formErrors: {},
      data: { email: resetFormData.email, password: '' },
      notifications: [
        {
          type: 'error',
          message: 'Unable to send password reset link. Please try again.',
        },
      ],
    }
  }

  return {
    formErrors: {},
    data: { email: resetFormData.email, password: '' },
    notifications: [
      {
        type: 'success',
        message:
          'If an account exists for that email, a reset link has been sent.',
      },
    ],
  }
}

export const updatePassword = async (
  formData: FormData
): Promise<AuthFormState> => {
  const updateFormData = {
    email: '',
    password:
      (formData.get(LOGIN_FORM_DATA_KEYS.PASSWORD) as string)?.trim() || '',
    confirmPassword:
      (formData.get(LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD) as string)?.trim() ||
      '',
  }

  const validatedData = updatePasswordSchema.safeParse(updateFormData)

  if (!validatedData.success) {
    return {
      formErrors: zodErrorsToFormErrors(validatedData.error),
      data: updateFormData,
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      formErrors: {},
      data: updateFormData,
      notifications: [
        {
          type: 'error',
          message:
            'Password reset link is invalid or has expired. Please request a new one.',
        },
      ],
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: validatedData.data.password,
  })

  if (error) {
    return {
      formErrors: {},
      data: updateFormData,
      notifications: [
        {
          type: 'error',
          message: 'Failed to update your password. Please try again.',
        },
      ],
    }
  }

  return {
    formErrors: {},
    data: updateFormData,
    notifications: [
      {
        type: 'success',
        message:
          'Your password has been updated. You will be redirected shortly.',
      },
    ],
  }
}
