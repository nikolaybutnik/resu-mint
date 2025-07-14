export interface KeywordAnalysis {
  hardSkills: string[]
  softSkills: string[]
  contextualSkills: string[]
}

export interface KeywordUsageStats {
  keyword: string
  category: 'hard' | 'soft' | 'contextual'
  usageCount: number
  sections: string[] // Which sections use this keyword
}

export interface KeywordPriority {
  high: string[] // 0 uses, prioritize heavily
  medium: string[] // 1 use, medium priority
  low: string[] // 2 uses, low priority
  saturated: string[] // 3+ uses, exclude from prompts
}

export interface KeywordAlignment {
  overallAlignment: number
  categoryBreakdown: {
    hardSkills: { used: number; total: number; percentage: number }
    softSkills: { used: number; total: number; percentage: number }
    contextualSkills: { used: number; total: number; percentage: number }
  }
  usedKeywords: string[]
  missingKeywords: string[]
}

export interface KeywordData {
  keywordAnalysis: KeywordAnalysis
  usageStats: KeywordUsageStats[]
  priority: KeywordPriority
  promptKeywords: {
    priorityKeywords: string[]
    excludeKeywords: string[]
  }
  alignment: KeywordAlignment
}
