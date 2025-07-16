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
