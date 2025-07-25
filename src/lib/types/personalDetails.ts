export interface PersonalDetails {
  name: string
  email: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
}

export type PersonalDetailsFormState = {
  errors: Record<string, string>
  data?: PersonalDetails
}
