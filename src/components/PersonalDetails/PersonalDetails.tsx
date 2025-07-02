import styles from './PersonalDetails.module.scss'
import { useActionState, Suspense } from 'react'
import { useFormStatus } from 'react-dom'
import { PersonalDetailsFormState } from '@/lib/types/personalDetails'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'
import { usePersonalDetails } from '@/lib/hooks/usePersonalDetails'
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

// TODO: this will be useful when saving data gets tied to a database. Add a loading indicator
const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus()

  return (
    <button type='submit' className={styles.formButton} disabled={pending}>
      Save
    </button>
  )
}

const PersonalDetailsContent: React.FC = () => {
  const { data: personalDetails, save } = usePersonalDetails()

  const [state, formAction] = useActionState(
    (prevState: PersonalDetailsFormState, formData: FormData) =>
      submitPersonalDetails(prevState, formData, save),
    {
      errors: {},
      data: personalDetails,
    } as PersonalDetailsFormState
  )

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
        <SubmitButton />
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

const PersonalDetails: React.FC = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <PersonalDetailsContent />
    </Suspense>
  )
}

export default PersonalDetails
