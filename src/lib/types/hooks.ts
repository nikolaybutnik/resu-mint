import { PersonalDetails } from './personalDetails'
// import { EducationBlockData } from './education'
// import { ExperienceBlockData } from './experience'
// import { ProjectBlockData } from './projects'

export interface DataHookResult<T> {
  data: T
  hasData: boolean
  save: (data: T) => Promise<void>
  refresh: () => void
}

export type PersonalDetailsHookResult = DataHookResult<PersonalDetails>

// Future hook types (ready to uncomment when needed):
// export type EducationHookResult = DataHookResult<
//   EducationBlockData[] | null,
//   EducationBlockData[]
// >

// export type ExperienceHookResult = DataHookResult<
//   ExperienceBlockData[] | null,
//   ExperienceBlockData[]
// >

// export type ProjectsHookResult = DataHookResult<
//   ProjectBlockData[] | null,
//   ProjectBlockData[]
// >
