import { Row } from '@electric-sql/client'

export interface PersonalDetails {
  id?: string
  name: string
  email: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
  updatedAt?: string
}

export type PersonalDetailsRow = Row<PersonalDetails>

export type PersonalDetailsFormState = {
  fieldErrors: Record<string, string>
  data?: PersonalDetails
}
