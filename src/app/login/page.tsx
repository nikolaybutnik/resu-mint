'use client'

import styles from './page.module.scss'
import { LOGIN_FORM_DATA_KEYS } from '@/lib/constants'
import { useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/lib/actions/loginActions'
import { AuthFormState } from '@/lib/types/auth'
import { useAuthStore } from '@/stores'

const FORM_STATE = {
  LOGIN: 'login',
  SIGN_UP: 'signup',
} as const

const submitAuth = async (
  formData: FormData,
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>,
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
): Promise<AuthFormState> => {
  const mode = formData.get(LOGIN_FORM_DATA_KEYS.MODE) as string

  if (mode === FORM_STATE.SIGN_UP) {
    // TODO: Call signup action
    console.log(signUp)
    return {
      errors: {},
      data: {
        email: (formData.get(LOGIN_FORM_DATA_KEYS.EMAIL) as string) || '',
        password: (formData.get(LOGIN_FORM_DATA_KEYS.PASSWORD) as string) || '',
        confirmPassword:
          (formData.get(LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD) as string) || '',
      },
      mode,
    }
  } else {
    return await login(formData, signIn)
  }
}

const SubmitButton: React.FC<{ isSignUp: boolean }> = ({ isSignUp }) => {
  const { pending } = useFormStatus()

  return (
    <button type='submit' disabled={pending} className={styles.submitButton}>
      {pending ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
    </button>
  )
}

export default function LoginPage() {
  const { signIn, signUp } = useAuthStore()

  const [isSignUp, setIsSignUp] = useState(false)
  const [state, action] = useActionState(
    (_previousState: AuthFormState, formData: FormData) =>
      submitAuth(formData, signIn, signUp),
    {
      errors: {},
      data: {
        email: '',
        password: '',
      },
      mode: FORM_STATE.LOGIN,
    }
  )

  return (
    <div className={styles.loginPage}>
      <div className={styles.formWrapper}>
        <h1>{isSignUp ? 'Sign Up' : 'Sign In'}</h1>

        <form action={action} className={styles.form}>
          <input
            type='hidden'
            name={LOGIN_FORM_DATA_KEYS.MODE}
            value={isSignUp ? FORM_STATE.SIGN_UP : FORM_STATE.LOGIN}
          />

          <div className={styles.field}>
            <label htmlFor={LOGIN_FORM_DATA_KEYS.EMAIL}>Email</label>
            <input
              type='text'
              name={LOGIN_FORM_DATA_KEYS.EMAIL}
              defaultValue={state.data?.email || ''}
            />
            {state.errors.email && (
              <span className={styles.fieldError}>{state.errors.email}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={LOGIN_FORM_DATA_KEYS.PASSWORD}>Password</label>
            <input
              type='text'
              name={LOGIN_FORM_DATA_KEYS.PASSWORD}
              defaultValue={state.data?.password || ''}
            />
            {state.errors.password && (
              <span className={styles.fieldError}>{state.errors.password}</span>
            )}
          </div>

          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor={LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD}>
                Confirm Password
              </label>
              <input
                type='text'
                name={LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD}
                defaultValue={state.data?.confirmPassword || ''}
              />
              {state.errors.confirmPassword && (
                <span className={styles.fieldError}>
                  {state.errors.confirmPassword}
                </span>
              )}
            </div>
          )}

          {state.errors.general && (
            <div className={styles.error}>{state.errors.general}</div>
          )}

          <SubmitButton isSignUp={isSignUp} />
        </form>

        <button
          type='button'
          onClick={() => setIsSignUp(!isSignUp)}
          className={styles.toggleButton}
        >
          {isSignUp
            ? 'Already have an account? Sign In'
            : 'Need an account? Sign Up'}
        </button>
      </div>
    </div>
  )
}
