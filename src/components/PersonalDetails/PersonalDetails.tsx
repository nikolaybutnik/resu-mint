import styles from './PersonalDetails.module.scss'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import {
  PersonalDetailsFormState,
  PersonalDetails as PersonalDetailsType,
} from '@/lib/types/personalDetails'
import { submitPersonalDetails } from '@/lib/actions/personalDetailsActions'
import { PERSONAL_DETAILS_FORM_DATA_KEYS } from '@/lib/constants'

interface PersonalDetailsProps {
  data: PersonalDetailsType
  loading: boolean
  onSave: (data: PersonalDetailsType) => void
}

const FORM_FIELDS = [
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
] as const

// TODO: this will be useful when saving data gets tied to a database. Add a loading indicator
const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus()

  return (
    <button type='submit' className={styles.formButton} disabled={pending}>
      Save
    </button>
  )
}

const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  data,
  loading,
  onSave,
}) => {
  const [state, formAction] = useActionState(
    (prevState: PersonalDetailsFormState, formData: FormData) =>
      submitPersonalDetails(prevState, formData, onSave),
    {
      errors: {},
      data,
    } as PersonalDetailsFormState
  )

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your details...' size='lg' />
      ) : (
        <form className={styles.formSection} action={formAction}>
          <h2 className={styles.formTitle}>Personal Details</h2>

          <div className={styles.requiredFieldsNote}>
            <span className={styles.requiredIndicator}>*</span>
            Indicates a required field
          </div>

          {FORM_FIELDS.map((field) => (
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

          <div className={styles.actionButtons}>
            <SubmitButton />
          </div>
        </form>
      )}
    </>
  )
}

export default PersonalDetails
