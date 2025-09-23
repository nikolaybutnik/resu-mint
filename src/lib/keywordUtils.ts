import React from 'react'
import { ExperienceBlockData } from './types/experience'
import {
  KeywordAnalysis,
  KeywordPriority,
  KeywordUsageStats,
  KeywordAlignment,
} from './types/keywords'
import { ProjectBlockData } from './types/projects'

export class KeywordUtils {
  /**
   * Analyzes keyword usage across all resume sections
   *
   * @param workExperience - Array of work experience sections
   * @param projects - Array of project sections
   * @param keywordAnalysis - Categorized keywords from job analysis
   * @returns Array of keyword usage statistics
   */
  static analyzeKeywordUsage = (
    workExperience: ExperienceBlockData[],
    projects: ProjectBlockData[],
    keywordAnalysis: KeywordAnalysis
  ): KeywordUsageStats[] => {
    const stats: KeywordUsageStats[] = []

    const allBullets: { text: string; sectionId: string }[] = []

    workExperience.forEach((exp) => {
      if (exp.isIncluded) {
        exp.bulletPoints?.forEach((bullet) => {
          allBullets.push({ text: bullet.text, sectionId: exp.id })
        })
      }
    })

    projects.forEach((project) => {
      if (project.isIncluded) {
        project.bulletPoints?.forEach((bullet) => {
          allBullets.push({ text: bullet.text, sectionId: project.id })
        })
      }
    })

    const analyzeCategory = (
      keywords: string[],
      category: 'hard' | 'soft' | 'contextual'
    ): void => {
      keywords.forEach((keyword) => {
        let usageCount = 0
        const sections: string[] = []

        // Count occurrences across all bullets
        allBullets.forEach(({ text, sectionId }) => {
          const regex = new RegExp(
            `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'gi'
          )
          const matches = text.match(regex)
          if (matches) {
            usageCount += matches.length
            if (!sections.includes(sectionId)) {
              sections.push(sectionId)
            }
          }
        })

        stats.push({
          keyword,
          category,
          usageCount,
          sections,
        })
      })
    }

    analyzeCategory(keywordAnalysis.hardSkills, 'hard')
    analyzeCategory(keywordAnalysis.softSkills, 'soft')
    analyzeCategory(keywordAnalysis.contextualSkills, 'contextual')

    return stats
  }

  /**
   * Categorizes keywords by priority based on usage and category
   *
   * @param usageStats - Keyword usage statistics
   * @returns Categorized keyword priority object
   */
  // TODO: develop a mechanism for dealing with hard skills keywords that do not appear in the user's work experience or projects.
  // If the user doesn't have experience in a certain skill, these skills should not be high priority to include in the resume.
  // Failing to deprioritize these skills may make the LLM hallucinate fictional duties to try and stuff them in.
  // A better strategy may be to first find an alignment between job description analysis, and the content of the user's resume, and prioritize the keywords that are most aligned.
  // I should track the poorly aligned keywords and prompt the user to add relevant details to their work/project descriptions.
  static categorizeKeywordsByPriority = (
    usageStats: KeywordUsageStats[]
  ): KeywordPriority => {
    const priority: KeywordPriority = {
      high: [],
      medium: [],
      low: [],
      saturated: [],
    }

    // Group by usage count first, then sort by category within each group
    usageStats.forEach((stat) => {
      switch (stat.usageCount) {
        case 0:
          priority.high.push(stat.keyword)
          break
        case 1:
          priority.medium.push(stat.keyword)
          break
        case 2:
          priority.low.push(stat.keyword)
          break
        default: // 3+ uses
          priority.saturated.push(stat.keyword)
          break
      }
    })

    // Sort each priority group by category importance (hard > soft > contextual)
    const sortByCategory = (keywords: string[]): string[] => {
      return keywords.sort((a, b) => {
        const statA = usageStats.find((s) => s.keyword === a)!
        const statB = usageStats.find((s) => s.keyword === b)!

        const categoryOrder = { hard: 0, soft: 1, contextual: 2 }
        return categoryOrder[statA.category] - categoryOrder[statB.category]
      })
    }

    priority.high = sortByCategory(priority.high)
    priority.medium = sortByCategory(priority.medium)
    priority.low = sortByCategory(priority.low)
    priority.saturated = sortByCategory(priority.saturated)

    return priority
  }

  /**
   * Get prioritized keywords for prompt injection
   *
   * @param priority - Categorized keyword priority object
   * @returns Object containing priority keywords and excluded keywords, ordered by priority
   */
  static getPromptKeywords(priority: KeywordPriority): {
    priorityKeywords: string[]
    excludeKeywords: string[]
  } {
    return {
      priorityKeywords: [
        ...priority.high, // Hard skills first
        ...priority.medium, // Soft skills second
        ...priority.low, // Contextual skills last
      ],
      excludeKeywords: priority.saturated,
    }
  }

  /**
   * Highlights keywords in text by wrapping them in span elements
   * Case-insensitive matching with word boundaries: "TypeScript" will match "typescript", "TyPeSCRipt", etc.
   * but will not match partial words (e.g., "ai" won't match within "gains")
   *
   * @param text - The text to highlight keywords in
   * @param keywords - Array of keywords to highlight
   * @param className - CSS class name to apply to highlighted keywords
   * @returns Array of text segments and JSX span elements
   */
  static highlightKeywords = (
    text: string,
    keywords: string[],
    className: string = 'keyword-highlight'
  ): (string | React.ReactElement)[] => {
    if (!text || !keywords.length) return [text]

    const segments: (string | React.ReactElement)[] = []
    let remainingText = text
    let segmentIndex = 0

    // Sort keywords by length (longest first) to avoid partial matches
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)

    while (remainingText.length > 0) {
      let foundMatch = false
      let earliestMatch: {
        keyword: string
        index: number
        matchLength: number
      } | null = null

      // Find the earliest match among all keywords using word boundaries
      for (const keyword of sortedKeywords) {
        // Escape special regex characters in the keyword
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Create regex with word boundaries and case-insensitive flag
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i')
        const match = remainingText.match(regex)

        if (match && match.index !== undefined) {
          if (!earliestMatch || match.index < earliestMatch.index) {
            earliestMatch = {
              keyword,
              index: match.index,
              matchLength: match[0].length,
            }
          }
        }
      }

      if (earliestMatch) {
        const { index, matchLength } = earliestMatch

        // Add text before the match
        if (index > 0) {
          segments.push(remainingText.substring(0, index))
        }

        // Add the highlighted keyword as JSX (preserve original case)
        const matchedText = remainingText.substring(index, index + matchLength)
        segments.push(
          React.createElement(
            'span',
            { key: `highlight-${segmentIndex++}`, className },
            matchedText
          )
        )

        // Update remaining text
        remainingText = remainingText.substring(index + matchLength)
        foundMatch = true
      }

      if (!foundMatch) {
        // No more matches, add remaining text
        segments.push(remainingText)
        break
      }
    }

    return segments
  }

  /**
   * Calculates alignment percentage between job description keywords and resume content
   *
   * @param usageStats - Keyword usage statistics from resume analysis
   * @param keywordAnalysis - Original keywords from job description analysis
   * @returns Alignment percentage and breakdown by category
   */
  static calculateKeywordAlignment = (
    usageStats: KeywordUsageStats[],
    keywordAnalysis: KeywordAnalysis
  ): KeywordAlignment => {
    const totalKeywords =
      keywordAnalysis.hardSkills.length +
      keywordAnalysis.softSkills.length +
      keywordAnalysis.contextualSkills.length

    const usedKeywords = usageStats
      .filter((stat) => stat.usageCount > 0)
      .map((stat) => stat.keyword)

    const missingKeywords = [
      ...keywordAnalysis.hardSkills,
      ...keywordAnalysis.softSkills,
      ...keywordAnalysis.contextualSkills,
    ].filter((keyword) => !usedKeywords.includes(keyword))

    // Calculate category-specific alignment
    const calculateCategoryAlignment = (keywords: string[]) => {
      const used = keywords.filter((keyword) =>
        usedKeywords.includes(keyword)
      ).length
      const total = keywords.length
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0
      return { used, total, percentage }
    }

    const categoryBreakdown = {
      hardSkills: calculateCategoryAlignment(keywordAnalysis.hardSkills),
      softSkills: calculateCategoryAlignment(keywordAnalysis.softSkills),
      contextualSkills: calculateCategoryAlignment(
        keywordAnalysis.contextualSkills
      ),
    }

    const overallAlignment =
      totalKeywords > 0
        ? Math.round((usedKeywords.length / totalKeywords) * 100)
        : 0

    return {
      overallAlignment,
      categoryBreakdown,
      usedKeywords,
      missingKeywords,
    }
  }
}
