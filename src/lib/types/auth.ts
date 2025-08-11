import type { ToastMessage } from './toast'

export interface AuthFormState {
  formErrors: Record<string, string>
  data?: {
    email: string
    password: string
    confirmPassword?: string
  }
  mode?: string
  notifications?: ToastMessage[]
}
