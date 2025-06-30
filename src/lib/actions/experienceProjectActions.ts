import { submitExperience } from './experienceActions'
import { submitProject } from './projectActions'
import { ExperienceBlockData } from '../types/experience'
import { ProjectBlockData } from '../types/projects'
import { STORAGE_KEYS } from '../constants'
import { v4 as uuidv4 } from 'uuid'
import { PROJECT_FORM_DATA_KEYS, EXPERIENCE_FORM_DATA_KEYS } from '../constants'

export const FormSelectionState = {
  experience: 'experience',
  project: 'project',
} as const

export type StoredDataItem = ExperienceBlockData | ProjectBlockData

export type ExperienceProjectFormData = {
  type: 'experience' | 'project'
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
  formData: FormData
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

  const data: ExperienceProjectFormData = {
    type,
    id: prevState.data?.id || uuidv4(),
    title:
      (formData.get(EXPERIENCE_FORM_DATA_KEYS.TITLE) as string)?.trim() || '',
    companyName:
      (
        formData.get(EXPERIENCE_FORM_DATA_KEYS.COMPANY_NAME) as string
      )?.trim() || '',
    location:
      (formData.get(EXPERIENCE_FORM_DATA_KEYS.LOCATION) as string)?.trim() ||
      '',
    link: (formData.get(PROJECT_FORM_DATA_KEYS.LINK) as string)?.trim() || '',
    technologies:
      (formData.get(PROJECT_FORM_DATA_KEYS.TECHNOLOGIES) as string)?.trim() ||
      '',
    startDate: {
      month:
        (formData.get(EXPERIENCE_FORM_DATA_KEYS.START_DATE_MONTH) as string) ||
        '',
      year:
        (
          formData.get(EXPERIENCE_FORM_DATA_KEYS.START_DATE_YEAR) as string
        )?.trim() || '',
    },
    endDate: {
      month:
        (formData.get(EXPERIENCE_FORM_DATA_KEYS.END_DATE_MONTH) as string) ||
        '',
      year:
        (
          formData.get(EXPERIENCE_FORM_DATA_KEYS.END_DATE_YEAR) as string
        )?.trim() || '',
      isPresent: !!formData.get(EXPERIENCE_FORM_DATA_KEYS.END_DATE_IS_PRESENT),
    },
    description:
      (formData.get(EXPERIENCE_FORM_DATA_KEYS.DESCRIPTION) as string)?.trim() ||
      '',
  }

  const handleSave = (savedData: ExperienceBlockData | ProjectBlockData) => {
    const storageKey =
      type === FormSelectionState.experience
        ? STORAGE_KEYS.EXPERIENCE
        : STORAGE_KEYS.PROJECTS
    const existingData = localStorage.getItem(storageKey)
    const dataArray = existingData ? JSON.parse(existingData) : []

    const isEditing =
      savedData.id &&
      dataArray.some((item: StoredDataItem) => item.id === savedData.id)

    if (isEditing) {
      const index = dataArray.findIndex(
        (item: StoredDataItem) => item.id === savedData.id
      )
      if (index !== -1) {
        dataArray[index] = savedData
      }
    } else {
      dataArray.push(savedData)
    }

    localStorage.setItem(storageKey, JSON.stringify(dataArray))
  }

  if (type === FormSelectionState.experience) {
    const experienceFormData = new FormData()
    experienceFormData.append(EXPERIENCE_FORM_DATA_KEYS.TITLE, data.title)
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.COMPANY_NAME,
      data.companyName || ''
    )
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.LOCATION,
      data.location || ''
    )
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.START_DATE_MONTH,
      data.startDate.month
    )
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.START_DATE_YEAR,
      data.startDate.year
    )
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.END_DATE_MONTH,
      data.endDate.month
    )
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.END_DATE_YEAR,
      data.endDate.year
    )
    if (data.endDate.isPresent) {
      experienceFormData.append(
        EXPERIENCE_FORM_DATA_KEYS.END_DATE_IS_PRESENT,
        'true'
      )
    }
    experienceFormData.append(
      EXPERIENCE_FORM_DATA_KEYS.DESCRIPTION,
      data.description
    )

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
      experienceFormData,
      handleSave,
      []
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
      handleSave,
      []
    )

    return {
      errors: result.errors,
      data: data,
      success: Object.keys(result.errors).length === 0,
    } as ExperienceProjectFormState
  }
}

export { initialState as experienceProjectInitialState }
