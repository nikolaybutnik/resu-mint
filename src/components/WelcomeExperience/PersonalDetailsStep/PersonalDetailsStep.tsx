import styles from './PersonalDetailsStep.module.scss'
import { useActionState } from 'react'
import { PersonalDetails as PersonalDetailsType } from '@/lib/types/personalDetails'
import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PersonalDetailsFormState } from '@/lib/types/personalDetails'

interface PersonalDetailsStepProps {
  onSubmit: (data: PersonalDetailsType) => void
  initialData?: PersonalDetailsType
}

export const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({
  onSubmit,
  initialData,
}) => {
  const [state, formAction, isPending] = useActionState(
    (prevState: PersonalDetailsFormState, formData: FormData) =>
      submitPersonalDetails(prevState, formData, onSubmit),
    {
      errors: {},
      data: initialData,
    } as PersonalDetailsFormState
  )

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Full Name</label>
        <input
          type='text'
          name={PERSONAL_DETAILS_FORM_DATA_KEYS.NAME}
          className={`${styles.formInput} ${
            state?.errors?.name ? styles.error : ''
          }`}
          defaultValue={state.data?.name}
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
          name={PERSONAL_DETAILS_FORM_DATA_KEYS.EMAIL}
          className={`${styles.formInput} ${
            state?.errors?.email ? styles.error : ''
          }`}
          defaultValue={state.data?.email}
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
  )
}
