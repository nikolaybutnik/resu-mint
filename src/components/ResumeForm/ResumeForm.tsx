'use client'
import { useActionState, useState } from 'react'
import styles from './ResumeForm.module.scss'

type FormFields = {
  experience: string
  jobDescription: string
  numBulletsPerExperience: number
  maxCharsPerBullet: number
}

export const ResumeForm: React.FC = () => {
  const [formValues, setFormValues] = useState<FormFields>({
    experience: '',
    jobDescription: '',
    numBulletsPerExperience: 0,
    maxCharsPerBullet: 0,
  })

  const [_state, formAction] = useActionState(
    async (_previousState: FormFields | null, formData: FormData) => {
      const data: FormFields = {
        experience: formData.get('experience') as string,
        jobDescription: formData.get('jobDescription') as string,
        numBulletsPerExperience: Number(
          formData.get('numBulletsPerExperience')
        ),
        maxCharsPerBullet: Number(formData.get('maxCharsPerBullet')),
      }
      console.log(data)
      return data
    },
    null
  )

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setFormValues((prev) => ({
      ...prev,
      [name]:
        name === 'numBulletsPerExperience' || name === 'maxCharsPerBullet'
          ? Number(value) || 0
          : value,
    }))
  }

  return (
    <form className={styles.form} action={formAction}>
      <textarea
        name='experience'
        placeholder='Work Experience'
        className={styles.formInput}
        value={formValues.experience}
        onChange={handleChange}
      />
      <textarea
        name='jobDescription'
        placeholder='Job Description'
        className={styles.formInput}
        value={formValues.jobDescription}
        onChange={handleChange}
      />
      <input
        type='number'
        name='numBulletsPerExperience'
        placeholder='Number of Bullets'
        className={styles.formInput}
        value={formValues.numBulletsPerExperience}
        onChange={handleChange}
      />
      <input
        type='number'
        name='maxCharsPerBullet'
        placeholder='Max Characters'
        className={styles.formInput}
        value={formValues.maxCharsPerBullet}
        onChange={handleChange}
      />
      <button type='submit' className={styles.formButton}>
        Mint Resume
      </button>
    </form>
  )
}
