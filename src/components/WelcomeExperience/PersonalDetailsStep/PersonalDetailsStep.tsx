import styles from './PersonalDetailsStep.module.scss'
import { useActionState } from 'react'
import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PersonalDetailsFormState } from '@/lib/types/personalDetails'
import { SkeletonInputField } from '@/components/shared/Skeleton/SkeletonInputField'
import { SkeletonButton } from '@/components/shared/Skeleton/SkeletonButton'
import { usePersonalDetailsStore } from '@/stores'

interface PersonalDetailsStepProps {
  onContinue: () => void
}

const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({
  onContinue,
}) => {
  const {
    data: personalDetails,
    initializing,
    save,
  } = usePersonalDetailsStore()

  const [state, formAction, isPending] = useActionState(
    async (prevState: PersonalDetailsFormState, formData: FormData) => {
      const result = await submitPersonalDetails(prevState, formData)

      if (Object.keys(result.errors).length === 0 && result.data) {
        try {
          await save(result.data)
          onContinue()
        } catch (error) {
          console.error(
            'PersonalDetailsStep: error saving personal details:',
            error
          )
          return {
            errors: { submit: 'Failed to save personal details' },
            data: result.data,
          }
        }
      }

      return result
    },
    {
      errors: {},
      data: personalDetails,
    } as PersonalDetailsFormState
  )

  if (initializing) {
    return <LoadingState />
  }

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

export default PersonalDetailsStep
