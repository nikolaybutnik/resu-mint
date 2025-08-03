import styles from './PersonalDetails.module.scss'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { PersonalDetailsFormState } from '@/lib/types/personalDetails'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'
import { usePersonalDetailsStore } from '@/stores'
import { SkeletonInputField } from '@/components/shared/Skeleton/SkeletonInputField'
import { SkeletonButton } from '@/components/shared/Skeleton/SkeletonButton'

const formFields = [
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.NAME,
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your full name',
    required: true,
  },
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.EMAIL,
    label: 'Email',
    type: 'text', // Using text to avoid browser validation conflicts
    placeholder: 'Enter your email address',
    required: true,
  },
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.PHONE,
    label: 'Phone',
    type: 'text',
    placeholder: 'e.g., +1234567890',
    required: false,
  },
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.LOCATION,
    label: 'Location',
    type: 'text',
    placeholder: 'e.g., New York, NY',
    required: false,
  },
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.LINKEDIN,
    label: 'LinkedIn URL',
    type: 'text',
    placeholder: 'https://linkedin.com/in/your-profile',
    required: false,
  },
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.GITHUB,
    label: 'GitHub URL',
    type: 'text',
    placeholder: 'https://github.com/your-username',
    required: false,
  },
  {
    name: PERSONAL_DETAILS_FORM_DATA_KEYS.WEBSITE,
    label: 'Website URL',
    type: 'text',
    placeholder: 'https://your-website.com',
    required: false,
  },
]

const SubmitButton: React.FC<{ hasChanges: boolean }> = ({ hasChanges }) => {
  const { pending } = useFormStatus()

  const shouldDisable = hasChanges && pending

  return (
    <button
      type='submit'
      className={styles.formButton}
      disabled={shouldDisable}
    >
      Save
    </button>
  )
}

const PersonalDetails: React.FC = () => {
  const {
    data: personalDetails,
    save,
    initializing,
    hasChanges,
  } = usePersonalDetailsStore()

  const [state, formAction] = useActionState(
    async (prevState: PersonalDetailsFormState, formData: FormData) => {
      const result = await submitPersonalDetails(prevState, formData)

      if (Object.keys(result.errors).length === 0 && result.data) {
        try {
          await save(result.data)
        } catch (error) {
          console.error(
            'PersonalDetails: error saving personal details:',
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

  const currentFormHasChanges = hasChanges(state.data || personalDetails)

  if (initializing) {
    return <LoadingState />
  }

  return (
    <form className={styles.formSection} action={formAction}>
      <h2 className={styles.formTitle}>Personal Details</h2>

      <div className={styles.formFieldsContainer}>
        <div className={styles.requiredFieldsNote}>
          <span className={styles.requiredIndicator}>*</span>
          Indicates a required field
        </div>

        {formFields.map((field) => (
          <div key={field.name} className={styles.formField}>
            <label className={styles.label}>
              {field.required && (
                <span className={styles.requiredIndicator}>*</span>
              )}
              {field.label}
            </label>
            <input
              type={field.type}
              name={field.name}
              className={`${styles.formInput} ${
                state?.errors?.[field.name] ? styles.error : ''
              }`}
              defaultValue={state.data?.[field.name] || ''}
              placeholder={field.placeholder}
            />
            {state?.errors?.[field.name] && (
              <span className={styles.formError}>
                {state.errors[field.name]}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.actionButtons}>
        <SubmitButton hasChanges={currentFormHasChanges} />
      </div>
    </form>
  )
}

const LoadingState = () => (
  <div className={styles.formSection}>
    <h2 className={styles.formTitle}>Personal Details</h2>
    <div className={styles.formFieldsContainer}>
      <SkeletonInputField hasLabel />
      <SkeletonInputField hasLabel />
      <SkeletonInputField hasLabel />
      <SkeletonInputField hasLabel />
      <SkeletonInputField hasLabel />
      <SkeletonInputField hasLabel />
      <SkeletonInputField hasLabel />
      <SkeletonButton variant='primary' />
    </div>
  </div>
)

export default PersonalDetails
