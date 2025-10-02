import {
  DegreeStatus,
  EducationBlockData,
  Month,
  RawEducationData,
} from '../types/education'
import { DEFAULT_STATE_VALUES } from '../constants'
import { useDbStore } from '@/stores'
import { getEducationQuery } from '../sql'

class EducationManager {
  private translateRawEducation(raw: RawEducationData): EducationBlockData {
    return {
      id: raw.id,
      institution: raw.institution,
      degree: raw.degree,
      degreeStatus: raw.degree_status as DegreeStatus | undefined,
      location: raw.location as string | undefined,
      description: raw.description || '',
      startDate: {
        month: (raw.start_month as Month | '' | undefined) || '',
        year: raw.start_year?.toString() || '',
      },
      endDate: {
        month: (raw.end_month as Month | '' | undefined) || '',
        year: raw.end_year?.toString() || '',
      },
      isIncluded: raw.is_included ?? true,
      position: raw.position ?? 0,
      updatedAt: raw.updated_at || undefined,
    }
  }

  async get(
    sectionId?: string
  ): Promise<EducationBlockData | EducationBlockData[] | undefined> {
    const { db } = useDbStore.getState()

    const data = await db?.query(getEducationQuery)

    if (!data?.rows?.length) {
      return sectionId ? undefined : DEFAULT_STATE_VALUES.EDUCATION
    }

    const translatedData = (data.rows as RawEducationData[]).map((row) =>
      this.translateRawEducation(row)
    )

    if (sectionId) {
      return translatedData.find((item) => item.id === sectionId)
    }

    return translatedData
  }
}

export const educationManager = new EducationManager()
