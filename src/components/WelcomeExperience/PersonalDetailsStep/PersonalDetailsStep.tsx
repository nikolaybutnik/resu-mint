import styles from './PersonalDetailsStep.module.scss'
import { useActionState, Suspense } from 'react'
import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PersonalDetailsFormState } from '@/lib/types/personalDetails'
import { usePersonalDetails } from '@/lib/hooks/usePersonalDetails'
import { SkeletonInputField } from '@/components/shared/Skeleton/SkeletonInputField'
import { SkeletonButton } from '@/components/shared/Skeleton/SkeletonButton'

interface PersonalDetailsStepProps {
  onSubmit: () => void
}

const PersonalDetailsStepContent: React.FC<PersonalDetailsStepProps> = ({
  onSubmit,
}) => {
  const { data: personalDetails } = usePersonalDetails()

  const [state, formAction, isPending] = useActionState(
    (prevState: PersonalDetailsFormState, formData: FormData) =>
      submitPersonalDetails(prevState, formData, onSubmit),
    {
      errors: {},
      data: personalDetails,
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
          defaultValue={state.data?.name || ''}
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
          defaultValue={state.data?.email || ''}
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

const LoadingState = () => (
  <div className={styles.form}>
    <SkeletonInputField hasLabel />
    <SkeletonInputField hasLabel />
    <SkeletonButton variant='primary' />
  </div>
)

export const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = (
  props
) => {
  return (
    <Suspense fallback={<LoadingState />}>
      <PersonalDetailsStepContent {...props} />
    </Suspense>
  )
}
