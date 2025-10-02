import {
  DegreeStatus,
  EducationBlockData,
  Month,
  RawEducationData,
} from '../types/education'
import { DEFAULT_STATE_VALUES } from '../constants'
import { useDbStore } from '@/stores'
import {
  getEducationQuery,
  insertEducationChangelogQuery,
  upsertEducationQuery,
} from '../sql'
import { nowIso } from './dataUtils'
import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from '@/stores'
import { getLastKnownUserId } from '../utils'
import {
  createValidationError,
  createUnknownError,
  Result,
  Failure,
  Success,
} from '../types/errors'
import { educationBlockSchema } from '../validationSchemas'

class EducationManager {
  private translateRawEducation(raw: RawEducationData): EducationBlockData {
    return {
      id: raw.id,
      institution: raw.institution,
      degree: raw.degree,
      degreeStatus:
        raw.degree_status !== null
          ? (raw.degree_status as DegreeStatus)
          : undefined,
      location: raw.location !== null ? raw.location : undefined,
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

  async upsert(
    data: EducationBlockData
  ): Promise<Result<EducationBlockData[]>> {
    const validation = educationBlockSchema.safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid education data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()
    const currentUser = useAuthStore.getState().user
    const userId = currentUser?.id || getLastKnownUserId()

    try {
      const blockToUpsert = validation.data

      const currentData = ((await this.get()) as EducationBlockData[]) || []
      const existingBlock = currentData.find(
        (block) => block.id === blockToUpsert.id
      )

      const position = existingBlock
        ? existingBlock.position
        : currentData.length

      await db?.query(upsertEducationQuery, [
        blockToUpsert.id,
        blockToUpsert.institution,
        blockToUpsert.degree,
        blockToUpsert.degreeStatus,
        blockToUpsert.location,
        blockToUpsert.description,
        blockToUpsert.startDate?.month,
        blockToUpsert.startDate?.year,
        blockToUpsert.endDate?.month,
        blockToUpsert.endDate?.year,
        blockToUpsert.isIncluded,
        position,
        timestamp,
      ])

      const blockWithPosition = { ...blockToUpsert, position }

      await db?.query(insertEducationChangelogQuery, [
        'upsert',
        JSON.stringify(blockWithPosition),
        writeId,
        timestamp,
        userId,
      ])

      const result = await db?.query(getEducationQuery)
      const translatedResult = (result?.rows as RawEducationData[]).map((row) =>
        this.translateRawEducation(row)
      )

      return Success(translatedResult)
    } catch (error) {
      return Failure(createUnknownError('Failed to save education', error))
    }
  }
}

export const educationManager = new EducationManager()
