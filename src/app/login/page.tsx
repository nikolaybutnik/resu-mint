'use client'

import styles from './page.module.scss'
import { LOGIN_FORM_DATA_KEYS } from '@/lib/constants'
import { useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login, signup, resetPassword } from '@/lib/actions/authActions'
import { AuthFormState } from '@/lib/types/auth'
import { useAuthStore } from '@/stores'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

// TODO: handle toast messages forgot password submit

const FORM_STATE = {
  LOGIN: 'login',
  SIGN_UP: 'signup',
  FORGOT_PASSWORD: 'forgot-password',
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
  } else if (mode === FORM_STATE.FORGOT_PASSWORD) {
    return await resetPassword(formData)
  } else {
    return await login(formData, signIn)
  }
}

const SubmitButton: React.FC<{ mode: string }> = ({ mode }) => {
  const { pending } = useFormStatus()

  const getButtonText = (): string => {
    if (pending) return 'Loading...'
    if (mode === FORM_STATE.SIGN_UP) return 'Sign Up'
    if (mode === FORM_STATE.FORGOT_PASSWORD) return 'Send Reset Link'
    return 'Sign In'
  }

  return (
    <button type='submit' disabled={pending} className={styles.submitButton}>
      {getButtonText()}
    </button>
  )
}

export default function LoginPage() {
  const { signIn, signUp } = useAuthStore()

  const [mode, setMode] = useState<
    (typeof FORM_STATE)[keyof typeof FORM_STATE]
  >(FORM_STATE.LOGIN)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')

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

  const getTitle = () => {
    if (mode === FORM_STATE.SIGN_UP) return 'Sign Up'
    if (mode === FORM_STATE.FORGOT_PASSWORD) return 'Reset Password'
    return 'Sign In'
  }

  const getModeValue = () => {
    return mode
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.formWrapper}>
        <h1>{getTitle()}</h1>

        <form action={action} className={styles.form}>
          <input
            type='hidden'
            name={LOGIN_FORM_DATA_KEYS.MODE}
            value={getModeValue()}
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

          {mode !== FORM_STATE.FORGOT_PASSWORD && (
            <div className={styles.field}>
              <label htmlFor={LOGIN_FORM_DATA_KEYS.PASSWORD}>Password</label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name={LOGIN_FORM_DATA_KEYS.PASSWORD}
                  defaultValue={state.data?.password || ''}
                  className={state.errors.password ? styles.error : ''}
                  onInput={(e) => setPasswordInput(e.currentTarget.value)}
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
                <span className={styles.fieldError}>
                  {state.errors.password}
                </span>
              )}
            </div>
          )}

          {mode === FORM_STATE.SIGN_UP && (
            <>
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

              <div className={styles.passwordRequirements}>
                <div className={styles.requirementItem}>
                  <span
                    className={
                      /[a-z]/.test(passwordInput)
                        ? styles.checkValid
                        : styles.checkInvalid
                    }
                  >
                    ✓
                  </span>
                  One lowercase letter
                </div>
                <div className={styles.requirementItem}>
                  <span
                    className={
                      /[A-Z]/.test(passwordInput)
                        ? styles.checkValid
                        : styles.checkInvalid
                    }
                  >
                    ✓
                  </span>
                  One uppercase letter
                </div>
                <div className={styles.requirementItem}>
                  <span
                    className={
                      /\d/.test(passwordInput)
                        ? styles.checkValid
                        : styles.checkInvalid
                    }
                  >
                    ✓
                  </span>
                  One number
                </div>
                <div className={styles.requirementItem}>
                  <span
                    className={
                      /[!@#$%^&*]/.test(passwordInput)
                        ? styles.checkValid
                        : styles.checkInvalid
                    }
                  >
                    ✓
                  </span>
                  One special character (!@#$%^&*)
                </div>
                <div className={styles.requirementItem}>
                  <span
                    className={
                      passwordInput.length >= 6 && passwordInput.length <= 15
                        ? styles.checkValid
                        : styles.checkInvalid
                    }
                  >
                    ✓
                  </span>
                  6-15 characters long
                </div>
              </div>
            </>
          )}

          <SubmitButton mode={mode} />

          {mode === FORM_STATE.LOGIN && (
            <button
              type='button'
              className={styles.forgotButton}
              onClick={() => setMode(FORM_STATE.FORGOT_PASSWORD)}
            >
              Forgot password?
            </button>
          )}
        </form>

        {mode !== FORM_STATE.FORGOT_PASSWORD && (
          <button
            type='button'
            onClick={() =>
              setMode(
                mode === FORM_STATE.SIGN_UP
                  ? FORM_STATE.LOGIN
                  : FORM_STATE.SIGN_UP
              )
            }
            className={styles.toggleButton}
          >
            {mode === FORM_STATE.SIGN_UP
              ? 'Already have an account? Sign In'
              : 'Need an account? Sign Up'}
          </button>
        )}

        {mode === FORM_STATE.FORGOT_PASSWORD && (
          <button
            type='button'
            onClick={() => setMode(FORM_STATE.LOGIN)}
            className={styles.toggleButton}
          >
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  )
}
