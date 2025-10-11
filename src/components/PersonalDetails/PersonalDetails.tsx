import styles from './PersonalDetails.module.scss'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { PersonalDetailsFormState } from '@/lib/actions/personalDetailsActions'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PERSONAL_DETAILS_FORM_DATA_KEYS, FORM_IDS } from '@/lib/constants'
import { usePersonalDetailsStore } from '@/stores'
import { SkeletonInputField } from '@/components/shared/Skeleton/SkeletonInputField'
import { SkeletonButton } from '@/components/shared/Skeleton/SkeletonButton'
import { toast } from '@/stores/toastStore'

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
    initializing,
    error: storeError,
    save,
    hasChanges,
    clearError,
  } = usePersonalDetailsStore()

  const [state, formAction] = useActionState(
    async (prevState: PersonalDetailsFormState, formData: FormData) => {
      clearError()
      const result = await submitPersonalDetails(prevState, formData)

      if (Object.keys(result.fieldErrors).length === 0 && result.data) {
        if (!hasChanges(result.data)) {
          toast.info("You haven't made any changes to your personal details.")
          return {
            fieldErrors: {},
            data: result.data,
          }
        }

        const saveResult = await save(result.data)

        if (!saveResult.error) {
          toast.success('Your personal details were updated.')
        }
      }

      return result
    },
    {
      fieldErrors: {},
      data: personalDetails,
    } as PersonalDetailsFormState
  )

  useEffect(() => {
    if (storeError) {
      switch (storeError.code) {
        case 'NETWORK_ERROR':
          toast.error(
            'Network connection failed. Please check your internet connection.'
          )
          break
        case 'UNKNOWN_ERROR':
          toast.error('An unexpected error occurred. Please try again.')
          break
        case 'VALIDATION_ERROR':
          toast.error('Invalid data provided. Please check your input.')
          break
        default:
          toast.error('Failed to save your changes. Please try again.')
      }
      clearError()
    }
  }, [storeError, clearError])

  const currentFormHasChanges = hasChanges(state.data || personalDetails)

  if (initializing) {
    return <LoadingState />
  }

  return (
    <form
      className={styles.formSection}
      action={formAction}
      data-tab={FORM_IDS.PERSONAL_DETAILS}
    >
      <h2 className={styles.formTitle}>Personal Details</h2>

      <div className={styles.formFieldsContainer}>
        <div className={styles.requiredFieldsNote}>
          <span className={styles.requiredIndicator}>*</span>
          Indicates a required field
        </div>

        <input type='hidden' name='id' value={personalDetails.id || ''} />
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
                state?.fieldErrors?.[field.name] ? styles.error : ''
              }`}
              key={`${field.name}-${personalDetails?.id || 'empty'}-${
                Object.keys(state.fieldErrors).length === 0
                  ? personalDetails?.updatedAt || 'initial'
                  : 'validation-error'
              }`}
              defaultValue={
                // Use form state data if there are validation errors (preserves user input)
                // Otherwise use store data (reflects Electric sync updates)
                Object.keys(state.fieldErrors).length > 0 && state.data
                  ? state.data[field.name] || ''
                  : personalDetails?.[field.name] || ''
              }
              placeholder={field.placeholder}
            />
            {state?.fieldErrors?.[field.name] && (
              <span className={styles.formError}>
                {state.fieldErrors[field.name]}
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
