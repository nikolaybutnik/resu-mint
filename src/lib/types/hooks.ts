// Generic interface for all data hooks
export interface DataHookResult<T, SaveType = T> {
  data: T
  hasData: boolean
  save: (data: SaveType) => Promise<void>
  refresh: () => void
}

// Specific hook result types
export interface PersonalDetailsHookResult
  extends DataHookResult<
    import('./personalDetails').PersonalDetails | null,
    import('./personalDetails').PersonalDetails
  > {}

// Future hook types (ready to uncomment when needed):
// export interface EducationHookResult extends DataHookResult<
//   import('./education').EducationBlockData[] | null,
//   import('./education').EducationBlockData[]
// > {}

// export interface ExperienceHookResult extends DataHookResult<
//   import('./experience').ExperienceBlockData[] | null,
//   import('./experience').ExperienceBlockData[]
// > {}

// export interface ProjectsHookResult extends DataHookResult<
//   import('./projects').ProjectBlockData[] | null,
//   import('./projects').ProjectBlockData[]
// > {}
