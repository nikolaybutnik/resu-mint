export interface AuthFormState {
  errors: Record<string, string>
  data?: {
    email: string
    password: string
    confirmPassword?: string
  }
  mode?: string
}
