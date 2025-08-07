'use client'

import styles from './page.module.scss'
import { LOGIN_FORM_DATA_KEYS } from '@/lib/constants'
import { useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, signup } from '@/lib/actions/authActions'
import { AuthFormState } from '@/lib/types/auth'
import { useAuthStore } from '@/stores'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

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
    return await signup(formData, signUp)
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
              className={state.errors.email ? styles.error : ''}
            />
            {state.errors.email && (
              <span className={styles.fieldError}>{state.errors.email}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={LOGIN_FORM_DATA_KEYS.PASSWORD}>Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                name={LOGIN_FORM_DATA_KEYS.PASSWORD}
                defaultValue={state.data?.password || ''}
                className={state.errors.password ? styles.error : ''}
                autoComplete='off'
              />
              <button
                type='button'
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {state.errors.password && (
              <span className={styles.fieldError}>{state.errors.password}</span>
            )}
          </div>

          {isSignUp && (
            <div className={styles.field}>
              <label htmlFor={LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD}>
                Confirm Password
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name={LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD}
                  defaultValue={state.data?.confirmPassword || ''}
                  className={state.errors.confirmPassword ? styles.error : ''}
                  autoComplete='off'
                />
                <button
                  type='button'
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {state.errors.confirmPassword && (
                <span className={styles.fieldError}>
                  {state.errors.confirmPassword}
                </span>
              )}
            </div>
          )}

          {state.errors.general && (
            <div className={styles.generalError}>{state.errors.general}</div>
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
