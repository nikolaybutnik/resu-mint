export const LanguageModel = {
  GPT_35_TURBO: 'gpt-3.5-turbo',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_41_MINI: 'gpt-4.1-mini',
} as const

export type LanguageModel = (typeof LanguageModel)[keyof typeof LanguageModel]

export interface AppSettings {
  bulletsPerExperienceBlock: number
  bulletsPerProjectBlock: number
  maxCharsPerBullet: number
  languageModel: LanguageModel
}
