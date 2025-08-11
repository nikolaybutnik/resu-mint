'use client'

import styles from './page.module.scss'
import { LOGIN_FORM_DATA_KEYS } from '@/lib/constants'
import { useEffect, useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updatePassword } from '@/lib/actions/authActions'
import { AuthFormState } from '@/lib/types/auth'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { toast } from '@/stores/toastStore'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus()

  return (
    <button type='submit' disabled={pending} className={styles.submitButton}>
      {pending ? 'Updating...' : 'Update Password'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [isValidating, setIsValidating] = useState(true)

  const [state, action] = useActionState(
    (_previousState: AuthFormState, formData: FormData) =>
      updatePassword(formData),
    {
      formErrors: {},
      data: {
        email: '',
        password: '',
        confirmPassword: '',
      },
    }
  )

  useEffect(() => {
    router.prefetch(ROUTES.HOME)
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(
      window.location.hash.replace('#', '')
    )

    const hasCode = searchParams.has('code') || hashParams.has('code')
    const hasErrorCode =
      searchParams.has('error_code') || hashParams.has('error_code')
    const error = searchParams.get('error') || hashParams.get('error')
    const errorCode =
      searchParams.get('error_code') || hashParams.get('error_code')

    if (!hasCode && !hasErrorCode && !error) {
      router.replace(ROUTES.HOME)
      return
    }

    if (error || errorCode) {
      let message = 'An error occurred with your reset link.'

      if (errorCode === 'otp_expired') {
        message =
          'Your password reset link has expired. Please request a new one.'
      } else if (error === 'access_denied') {
        message =
          'Password reset link is invalid or has expired. Please request a new one.'
      }

      toast.error(message)
    }

    setIsValidating(false)
  }, [router])

  useEffect(() => {
    const notifications = state?.notifications
    if (!notifications || notifications.length === 0) return

    notifications.forEach((notification) => {
      toast[notification.type](notification.message)
    })

    if (notifications.some((n) => n.type === 'success')) {
      const timeoutId = setTimeout(() => {
        router.replace(ROUTES.HOME)
      }, 4000)

      return () => clearTimeout(timeoutId)
    }
  }, [state?.notifications])

  if (isValidating) {
    return (
      <div className={styles.resetPasswordPage}>
        <div className={styles.formWrapper}>
          <div>Validating reset link...</div>
        </div>
      </div>
    )
  }

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
                className={state.formErrors.password ? styles.error : ''}
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
            {state.formErrors.password && (
              <span className={styles.fieldError}>
                {state.formErrors.password}
              </span>
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
                className={state.formErrors.confirmPassword ? styles.error : ''}
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
            {state.formErrors.confirmPassword && (
              <span className={styles.fieldError}>
                {state.formErrors.confirmPassword}
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
