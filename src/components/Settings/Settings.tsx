import styles from './Settings.module.scss'
import { useState, useEffect } from 'react'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'
import { AppSettings } from '@/lib/types/settings'

enum SettingsFields {
  BULLETS_PER_EXPERIENCE_BLOCK = 'bulletsPerExperienceBlock',
  BULLETS_PER_PROJECT_BLOCK = 'bulletsPerProjectBlock',
  MAX_CHARS_PER_BULLET = 'maxCharsPerBullet',
}

interface SettingsProps {
  data: AppSettings
  loading: boolean
  onSave: (data: AppSettings) => void
}

const Settings: React.FC<SettingsProps> = ({ data, loading, onSave }) => {
  const [formValues, setFormValues] = useState<AppSettings>(data)

  useEffect(() => {
    setFormValues(data)
  }, [data])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof AppSettings
  ) => {
    const value = parseInt(e.target.value)
    const newValues = {
      ...formValues,
      [field]: value,
    }
    setFormValues(newValues)
    onSave(newValues)
  }

  return (
    <>
      {loading ? (
        <LoadingSpinner text='Loading your settings...' size='lg' />
      ) : (
        <div className={styles.settings}>
          <h2 className={styles.formTitle}>Settings</h2>

          <div className={styles.formGroup}>
            <label htmlFor={SettingsFields.BULLETS_PER_EXPERIENCE_BLOCK}>
              Bullets Per Experience Block:{' '}
              {formValues.bulletsPerExperienceBlock}
            </label>
            <input
              type='range'
              className={styles.rangeInput}
              min={1}
              max={10}
              value={formValues.bulletsPerExperienceBlock}
              onChange={(e) =>
                handleChange(e, SettingsFields.BULLETS_PER_EXPERIENCE_BLOCK)
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={SettingsFields.BULLETS_PER_PROJECT_BLOCK}>
              Bullets Per Project Block: {formValues.bulletsPerProjectBlock}
            </label>
            <input
              type='range'
              className={styles.rangeInput}
              min={1}
              max={10}
              value={formValues.bulletsPerProjectBlock}
              onChange={(e) =>
                handleChange(e, SettingsFields.BULLETS_PER_PROJECT_BLOCK)
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={SettingsFields.MAX_CHARS_PER_BULLET}>
              Max Characters Per Bullet: {formValues.maxCharsPerBullet}
            </label>
            <input
              type='range'
              className={styles.rangeInput}
              min={100}
              max={500}
              step={5}
              value={formValues.maxCharsPerBullet}
              onChange={(e) =>
                handleChange(e, SettingsFields.MAX_CHARS_PER_BULLET)
              }
            />
          </div>
        </div>
      )}
    </>
  )
}

export default Settings
