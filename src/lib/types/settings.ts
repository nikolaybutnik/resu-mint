export const LanguageModel = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
} as const

export type LanguageModel = (typeof LanguageModel)[keyof typeof LanguageModel]

export interface AppSettings {
  bulletsPerExperienceBlock: number
  bulletsPerProjectBlock: number
  maxCharsPerBullet: number
  languageModel: LanguageModel
}
