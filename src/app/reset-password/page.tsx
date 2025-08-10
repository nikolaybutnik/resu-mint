'use client'

import styles from './page.module.scss'
import { LOGIN_FORM_DATA_KEYS } from '@/lib/constants'
import { useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updatePassword } from '@/lib/actions/authActions'
import { AuthFormState } from '@/lib/types/auth'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus()

  return (
    <button type='submit' disabled={pending} className={styles.submitButton}>
      {pending ? 'Updating...' : 'Update Password'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')

  const [state, action] = useActionState(
    (_previousState: AuthFormState, formData: FormData) =>
      updatePassword(formData),
    {
      errors: {},
      data: {
        email: '',
        password: '',
        confirmPassword: '',
      },
    }
  )

  return (
    <div className={styles.resetPasswordPage}>
      <div className={styles.formWrapper}>
        <h1>Set New Password</h1>

        <form action={action} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor={LOGIN_FORM_DATA_KEYS.PASSWORD}>New Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                name={LOGIN_FORM_DATA_KEYS.PASSWORD}
                defaultValue={state.data?.password || ''}
                className={state.errors.password ? styles.error : ''}
                onInput={(e) => setPasswordInput(e.currentTarget.value)}
                autoComplete='new-password'
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

          <div className={styles.field}>
            <label htmlFor={LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD}>
              Confirm New Password
            </label>
            <div className={styles.passwordContainer}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name={LOGIN_FORM_DATA_KEYS.CONFIRM_PASSWORD}
                defaultValue={state.data?.confirmPassword || ''}
                className={state.errors.confirmPassword ? styles.error : ''}
                autoComplete='new-password'
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

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
