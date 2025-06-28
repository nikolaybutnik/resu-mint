import styles from './PersonalDetailsStep.module.scss'
import { useActionState } from 'react'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { personalDetailsSchema } from '@/lib/validationSchemas'
import { zodErrorsToFormErrors } from '@/lib/types/errors'

interface PersonalDetailsStepProps {
  onSubmit: (data: PersonalDetailsType) => void
  initialData?: PersonalDetailsType
}

type FormState = {
  errors: Record<string, string>
  data?: PersonalDetailsType
}

const FORM_DATA_KEYS = {
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  LOCATION: 'location',
  LINKEDIN: 'linkedin',
  GITHUB: 'github',
  WEBSITE: 'website',
} as const

const submitPersonalDetails = (
  previousState: FormState,
  formData: FormData,
  onSubmit: (data: PersonalDetailsType) => void
) => {
  const personalDetailsData: PersonalDetailsType = {
    name: (formData.get(FORM_DATA_KEYS.NAME) as string)?.trim() || '',
    email: (formData.get(FORM_DATA_KEYS.EMAIL) as string)?.trim() || '',
    phone: previousState?.data?.phone || '',
    location: previousState?.data?.location || '',
    linkedin: previousState?.data?.linkedin || '',
    github: previousState?.data?.github || '',
    website: previousState?.data?.website || '',
  }

  const validatedData = personalDetailsSchema.safeParse(personalDetailsData)

  if (validatedData.success) {
    onSubmit(validatedData.data)
    return {
      errors: {},
      data: validatedData.data,
    }
  } else {
    return {
      errors: zodErrorsToFormErrors(validatedData.error),
      data: personalDetailsData,
    }
  }
}

export const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({
  onSubmit,
  initialData,
}) => {
  const [state, formAction, isPending] = useActionState(
    (prevState: FormState, formData: FormData) =>
      submitPersonalDetails(prevState, formData, onSubmit),
    {
      errors: {},
      data: initialData,
    } as FormState
  )

  return (
    <div className={styles.stepContent}>
      <form action={formAction} className={styles.form}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Full Name</label>
          <input
            type='text'
            name='name'
            className={`${styles.formInput} ${
              state?.errors?.name ? styles.error : ''
            }`}
            defaultValue={initialData?.name || state.data?.name}
            placeholder='Enter your full name'
          />
          {state?.errors?.name && (
            <span className={styles.formError}>{state.errors.name}</span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Email Address</label>
          <input
            type='text'
            name='email'
            className={`${styles.formInput} ${
              state?.errors?.email ? styles.error : ''
            }`}
            defaultValue={initialData?.email || state.data?.email}
            placeholder='Enter your email address'
          />
          {state?.errors?.email && (
            <span className={styles.formError}>{state.errors.email}</span>
          )}
        </div>

        <button
          type='submit'
          className={styles.submitButton}
          disabled={isPending}
        >
          Continue
        </button>
      </form>
    </div>
  )
}
