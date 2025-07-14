export interface JobDescriptionAnalysis {
  skillsRequired: {
    hard: string[] // e.g., ["React", "TypeScript", "GraphQL"]
    soft: string[] // e.g., ["Collaboration", "Problem-solving", "Communication"]
  }
  jobTitle: string // e.g., "Developer III, Front End (Javascript)- Enterprise"
  jobSummary: string // Concise summary of responsibilities and role, ~100-150 words
  specialInstructions: string // e.g., "Submit portfolio to hiring@example.com with a cover letter"
  location: {
    type: 'remote' | 'hybrid' | 'on-site' // Primary work arrangement
    details: string // Clarifications, e.g., "Remote, but requires quarterly on-site meetings in Ottawa, ON"
    listedLocation: string // Raw location from posting, e.g., "Ottawa, ON (Remote)"
  }
  companyName: string // e.g., "Billy Bob's Solutions"
  companyDescription: string // e.g., "Billy Bob's Solutions is a software development company that specializes in building custom software solutions for businesses..."
  contextualSkills: string[] // e.g., ["AWS", "Docker", "Kafka"]
  salaryRange: string // e.g., "$100,000 - $120,000"
}

export interface JobDetails {
  originalJobDescription: string
  analysis: JobDescriptionAnalysis
}
