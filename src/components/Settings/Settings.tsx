import styles from './Settings.module.scss'
import { useState, useEffect, useActionState, useRef } from 'react'
import {
  LanguageModel,
  SettingsFields,
  SettingsFormState,
} from '@/lib/types/settings'
import { useSettingsStore } from '@/stores'
import { submitSettings } from '@/lib/actions/settingsActions'
import { useDebouncedCallback } from '@/lib/clientUtils'
import { SkeletonInputField, SkeletonRangeInput } from '../shared/Skeleton'
import { FORM_IDS } from '@/lib/constants'

const Settings: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null)

  const { data: settings, initializing, save } = useSettingsStore()

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
      const result = await submitSettings(prevState, formData, settings)

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

  if (initializing) {
    return <LoadingState />
  }

  return (
    <form
      ref={formRef}
      className={styles.formSection}
      action={formAction}
      data-tab={FORM_IDS.SETTINGS}
    >
      <h2 className={styles.formTitle}>Settings</h2>

      <div className={styles.formFieldsContainer}>
        <input type='hidden' name='id' value={settings.id || ''} />
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

const LoadingState = () => (
  <div className={styles.formSection}>
    <h2 className={styles.formTitle}>Settings</h2>
    <div className={styles.formFieldsContainer}>
      <SkeletonRangeInput hasLabel />
      <SkeletonRangeInput hasLabel />
      <SkeletonRangeInput hasLabel />
      <SkeletonInputField hasLabel />
    </div>
  </div>
)

export default Settings
