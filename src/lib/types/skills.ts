export interface Skills {
  hardSkills: {
    skills: string[]
    suggestions: string[]
  }
  softSkills: {
    skills: string[]
    suggestions: string[]
  }
}

export type SkillType = 'hard' | 'soft'

export const SKILL_TYPES = {
  HARD: 'hard' as SkillType,
  SOFT: 'soft' as SkillType,
} as const

// TODO: need to figure out how to handle this in the Latex template.
// This is only an idea for now.
export type SkillDisplayMode = 'inline' | 'bulleted'

export interface SkillBlockLayout {
  displayMode: SkillDisplayMode
  maxRows?: number
}

// TODO: the idea is that the title will act as a category for the skills.
// The skills will be ordered by category by AI or manually.
export interface SkillBlock {
  id: string
  title?: string
  skills: string[]
  layout: SkillBlockLayout
  order: number // For drag/drop ordering
}
