import styles from './Settings.module.scss'
import { useState, useEffect, useActionState, useRef } from 'react'
import LoadingSpinner from '@/components/shared/LoadingSpinner/LoadingSpinner'
import {
  LanguageModel,
  SettingsFields,
  SettingsFormState,
} from '@/lib/types/settings'
import { useSettingsStore } from '@/stores/settingsStore'
import { submitSettings } from '@/lib/actions/settingsActions'
import { useDebouncedCallback } from '@/lib/clientUtils'

const Settings: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null)

  const { data: settings, loading, initializing, save } = useSettingsStore()

  const [bulletsPerExperienceBlock, setBulletsPerExperienceBlock] = useState(
    settings.bulletsPerExperienceBlock
  )
  const [bulletsPerProjectBlock, setBulletsPerProjectBlock] = useState(
    settings.bulletsPerProjectBlock
  )
  const [maxCharsPerBullet, setMaxCharsPerBullet] = useState(
    settings.maxCharsPerBullet
  )
  const [languageModel, setLanguageModel] = useState(settings.languageModel)

  useEffect(() => {
    setBulletsPerExperienceBlock(settings.bulletsPerExperienceBlock)
    setBulletsPerProjectBlock(settings.bulletsPerProjectBlock)
    setMaxCharsPerBullet(settings.maxCharsPerBullet)
    setLanguageModel(settings.languageModel)
  }, [settings])

  const debouncedSubmit = useDebouncedCallback(() => {
    formRef.current?.requestSubmit()
  }, 500)

  const [state, formAction] = useActionState(
    async (prevState: SettingsFormState, formData: FormData) => {
      const result = await submitSettings(prevState, formData)

      if (Object.keys(result.errors).length === 0 && result.data) {
        try {
          await save(result.data)
        } catch (error) {
          console.error('Settings: error saving settings:', error)
          return {
            errors: { submit: 'Failed to save settings' },
            data: result.data,
          }
        }
      }

      return result
    },
    {
      errors: {},
      data: settings,
    } as SettingsFormState
  )

  // TODO: build skeleton loader
  if (initializing) {
    return <div>Initializing...</div>
  }

  return (
    <form ref={formRef} className={styles.settings} action={formAction}>
      <h2 className={styles.formTitle}>Settings</h2>

      {loading && (
        <div className={styles.savingIndicator}>
          <LoadingSpinner size='sm' />
          <span>Saving settings...</span>
        </div>
      )}

      <div className={styles.formFieldsContainer}>
        <div className={styles.formField}>
          <label className={styles.label}>
            Bullets Per Experience Block: {bulletsPerExperienceBlock}
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min={1}
            max={10}
            value={bulletsPerExperienceBlock}
            onChange={(e) => {
              setBulletsPerExperienceBlock(Number(e.target.value))
              debouncedSubmit()
            }}
          />
          <input
            type='hidden'
            name={SettingsFields.BULLETS_PER_EXPERIENCE_BLOCK}
            value={bulletsPerExperienceBlock}
          />
          {state?.errors?.[SettingsFields.BULLETS_PER_EXPERIENCE_BLOCK] && (
            <span className={styles.formError}>
              {state.errors[SettingsFields.BULLETS_PER_EXPERIENCE_BLOCK]}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            Bullets Per Project Block: {bulletsPerProjectBlock}
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min={1}
            max={10}
            value={bulletsPerProjectBlock}
            onChange={(e) => {
              setBulletsPerProjectBlock(Number(e.target.value))
              debouncedSubmit()
            }}
          />
          <input
            type='hidden'
            name={SettingsFields.BULLETS_PER_PROJECT_BLOCK}
            value={bulletsPerProjectBlock}
          />
          {state?.errors?.[SettingsFields.BULLETS_PER_PROJECT_BLOCK] && (
            <span className={styles.formError}>
              {state.errors[SettingsFields.BULLETS_PER_PROJECT_BLOCK]}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            Max Characters Per Bullet: {maxCharsPerBullet}
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min={100}
            max={500}
            step={5}
            value={maxCharsPerBullet}
            onChange={(e) => {
              setMaxCharsPerBullet(Number(e.target.value))
              debouncedSubmit()
            }}
          />
          <input
            type='hidden'
            name={SettingsFields.MAX_CHARS_PER_BULLET}
            value={maxCharsPerBullet}
          />
          {state?.errors?.[SettingsFields.MAX_CHARS_PER_BULLET] && (
            <span className={styles.formError}>
              {state.errors[SettingsFields.MAX_CHARS_PER_BULLET]}
            </span>
          )}
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>
            Language Model: {languageModel}
          </label>
          <select
            key={languageModel}
            className={styles.formInput}
            name={SettingsFields.LANGUAGE_MODEL}
            defaultValue={languageModel}
            onChange={(e) => {
              setLanguageModel(e.target.value as LanguageModel)
              debouncedSubmit()
            }}
          >
            <option value={LanguageModel.GPT_35_TURBO}>GPT-3.5-turbo</option>
            <option value={LanguageModel.GPT_4O}>GPT-4o</option>
            <option value={LanguageModel.GPT_4O_MINI}>GPT-4o-mini</option>
            <option value={LanguageModel.GPT_41_MINI}>GPT-4.1-mini</option>
          </select>
          {state?.errors?.[SettingsFields.LANGUAGE_MODEL] && (
            <span className={styles.formError}>
              {state.errors[SettingsFields.LANGUAGE_MODEL]}
            </span>
          )}
        </div>
      </div>
    </form>
  )
}

export default Settings
