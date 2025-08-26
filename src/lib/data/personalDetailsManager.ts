import { PersonalDetails } from '../types/personalDetails'
import { personalDetailsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import { nowIso } from './dataUtils'
import {
  Result,
  Success,
  Failure,
  createValidationError,
  createUnknownError,
} from '../types/errors'
import { useDbStore } from '@/stores'
import {
  getPersonalDetailsQuery,
  insertPersonalDetailsChangelogQuery,
  upsertPersonalDetailsQuery,
} from '../sql'
import { v4 as uuidv4 } from 'uuid'

const CACHE_KEY = 'personalDetails'

class PersonalDetailsManager {
  private cache = new Map<string, Promise<unknown>>()

  async get(): Promise<PersonalDetails> {
    let { db } = useDbStore.getState()

    const data = await db?.query<PersonalDetails>(getPersonalDetailsQuery)

    if (!data?.rows?.length) {
      return DEFAULT_STATE_VALUES.PERSONAL_DETAILS
    }

    const [storedData] = data.rows

    return storedData
  }

  async save(data: PersonalDetails): Promise<Result<PersonalDetails>> {
    const validation = personalDetailsSchema.safeParse(data)

    if (!validation.success) {
      return Failure(
        createValidationError('Invalid personal details data', validation.error)
      )
    }

    const writeId = uuidv4()
    const timestamp = nowIso()
    const { db } = useDbStore.getState()

    try {
      await db?.query(upsertPersonalDetailsQuery, [
        data.id,
        data.name,
        data.email,
        data.phone ?? '',
        data.location ?? '',
        data.linkedin ?? '',
        data.github ?? '',
        data.website ?? '',
        timestamp,
      ])

      await db?.query(insertPersonalDetailsChangelogQuery, [
        'update',
        JSON.stringify(data),
        writeId,
        timestamp,
      ])
    } catch (error) {
      return Failure(
        createUnknownError('Failed to save personal details', error)
      )
    }

    return Success(validation.data)
  }

  invalidate() {
    this.cache.delete(CACHE_KEY)
  }
}

export const personalDetailsManager = new PersonalDetailsManager()
