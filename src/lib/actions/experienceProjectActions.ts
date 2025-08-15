import { submitExperience } from './experienceActions'
import { submitProject } from './projectActions'
import { ExperienceBlockData } from '../types/experience'
import { ProjectBlockData } from '../types/projects'
import { v4 as uuidv4 } from 'uuid'
import { PROJECT_FORM_DATA_KEYS } from '../constants'
import { SectionType } from '../types/api'
import { extractExperienceFormData } from '../utils'

export const FormSelectionState = {
  experience: 'experience',
  project: 'project',
} as const

export type StoredDataItem = ExperienceBlockData | ProjectBlockData

export type ExperienceProjectFormData = {
  type: SectionType
  id?: string
  title: string
  companyName?: string // Only for experience
  location?: string // Only for experience
  link?: string // Only for projects
  technologies?: string // Only for projects (comma-separated)
  startDate: {
    month: string
    year: string
  }
  endDate: {
    month: string
    year: string
    isPresent: boolean
  }
  description: string
}

export type ExperienceProjectFormState = {
  errors: Record<string, string>
  data: ExperienceProjectFormData | null
  success: boolean
}

const initialState: ExperienceProjectFormState = {
  errors: {},
  data: null,
  success: false,
}

export const submitExperienceProject = (
  prevState: ExperienceProjectFormState,
  formData: FormData,
  experienceData: ExperienceBlockData[],
  saveExperience: (data: ExperienceBlockData[]) => void,
  projectData: ProjectBlockData[],
  saveProject: (data: ProjectBlockData[]) => void
): ExperienceProjectFormState => {
  const type = formData.get('type') as keyof typeof FormSelectionState
  const isLoad = formData.get('load') === 'true'
  const isReset = formData.get('reset') === 'true'

  if (!type) {
    return {
      errors: { type: 'Form type is required' },
      data: null,
      success: false,
    }
  }

  if (isReset) {
    return {
      errors: {},
      data: null,
      success: false,
    }
  }

  if (isLoad) {
    const existingDataString = formData.get('existingData') as string
    if (existingDataString) {
      try {
        const existingData = JSON.parse(existingDataString)
        return {
          errors: {},
          data: {
            type,
            id: existingData.id,
            title: existingData.title || '',
            companyName: existingData.companyName || '',
            location: existingData.location || '',
            link: existingData.link || '',
            technologies: Array.isArray(existingData.technologies)
              ? existingData.technologies.join(', ')
              : '',
            startDate: existingData.startDate || { month: '', year: '' },
            endDate: existingData.endDate || {
              month: '',
              year: '',
              isPresent: false,
            },
            description: existingData.description || '',
          },
          success: false,
        }
      } catch (error) {
        console.error('Error parsing existing data:', error)
      }
    }

    return {
      errors: {},
      data: null,
      success: false,
    }
  }

  const experienceFormData = extractExperienceFormData(formData, {
    isIncluded: true,
    bulletPoints: [],
  })

  const data: ExperienceProjectFormData = {
    type,
    id: prevState.data?.id || experienceFormData.id || uuidv4(),
    title: experienceFormData.title,
    companyName: experienceFormData.companyName,
    location: experienceFormData.location,
    link: (formData.get(PROJECT_FORM_DATA_KEYS.LINK) as string)?.trim() || '',
    technologies:
      (formData.get(PROJECT_FORM_DATA_KEYS.TECHNOLOGIES) as string)?.trim() ||
      '',
    startDate: experienceFormData.startDate,
    endDate: experienceFormData.endDate,
    description: experienceFormData.description,
  }

  if (type === FormSelectionState.experience) {
    if (!formData.has('id')) {
      formData.append('id', data.id || uuidv4())
    }

    const result = submitExperience(
      {
        errors: {},
        data: {
          id: data.id || uuidv4(),
          isIncluded: true,
          bulletPoints: [],
          title: '',
          companyName: '',
          location: '',
          startDate: { month: '', year: '' },
          endDate: { month: '', year: '', isPresent: false },
          description: '',
        },
      },
      formData,
      experienceData,
      [],
      saveExperience
    )

    return {
      errors: result.errors,
      data: data,
      success: Object.keys(result.errors).length === 0,
    } as ExperienceProjectFormState
  } else {
    const projectFormData = new FormData()
    projectFormData.append(PROJECT_FORM_DATA_KEYS.TITLE, data.title)
    projectFormData.append(PROJECT_FORM_DATA_KEYS.LINK, data.link || '')
    projectFormData.append(
      PROJECT_FORM_DATA_KEYS.TECHNOLOGIES,
      data.technologies || ''
    )
    projectFormData.append(
      PROJECT_FORM_DATA_KEYS.START_DATE_MONTH,
      data.startDate.month
    )
    projectFormData.append(
      PROJECT_FORM_DATA_KEYS.START_DATE_YEAR,
      data.startDate.year
    )
    projectFormData.append(
      PROJECT_FORM_DATA_KEYS.END_DATE_MONTH,
      data.endDate.month
    )
    projectFormData.append(
      PROJECT_FORM_DATA_KEYS.END_DATE_YEAR,
      data.endDate.year
    )
    if (data.endDate.isPresent) {
      projectFormData.append(PROJECT_FORM_DATA_KEYS.END_DATE_IS_PRESENT, 'true')
    }
    projectFormData.append(PROJECT_FORM_DATA_KEYS.DESCRIPTION, data.description)

    const result = submitProject(
      {
        errors: {},
        data: {
          id: data.id || uuidv4(),
          isIncluded: true,
          bulletPoints: [],
          title: '',
          technologies: [],
          startDate: { month: '', year: '' },
          endDate: { month: '', year: '', isPresent: false },
          link: '',
          description: '',
        },
      },
      projectFormData,
      projectData,
      [],
      saveProject
    )

    return {
      errors: result.errors,
      data: data,
      success: Object.keys(result.errors).length === 0,
    } as ExperienceProjectFormState
  }
}

export { initialState as experienceProjectInitialState }
