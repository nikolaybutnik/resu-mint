import { STORAGE_KEYS } from '../constants'
import { PersonalDetails } from '../types/personalDetails'
import { personalDetailsSchema } from '../validationSchemas'
import { DEFAULT_STATE_VALUES } from '../constants'
import {
  isAuthenticated,
  waitForAuthReady,
  readLocalEnvelope,
  writeLocalEnvelope,
  nowIso,
} from './dataUtils'
import { supabase } from '../supabase/client'
import { useAuthStore } from '@/stores/authStore'
import {
  Result,
  Success,
  Failure,
  createNetworkError,
  createStorageError,
  createValidationError,
  createUnknownError,
  createQuotaExceededError,
  isQuotaExceededError,
  isNetworkError,
  OperationError,
} from '../types/errors'
import { useDbStore } from '@/stores'
import { getPersonalDetailsQuery, upsertPersonalDetailsQuery } from '../sql'

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

  // TODO: write to remote db?
  async save(data: PersonalDetails): Promise<Result<PersonalDetails>> {
    try {
      const validation = personalDetailsSchema.safeParse(data)

      if (!validation.success) {
        return Failure(
          createValidationError(
            'Invalid personal details data',
            validation.error
          )
        )
      }

      const { db } = useDbStore.getState()

      await db?.query(upsertPersonalDetailsQuery, [
        data.id,
        data.name,
        data.email,
        data.phone ?? '',
        data.location ?? '',
        data.linkedin ?? '',
        data.github ?? '',
        data.website ?? '',
        nowIso(),
      ])

      return Success(validation.data)
    } catch (error) {
      return Failure(createUnknownError('Unexpected error during save', error))
    }
  }

  invalidate() {
    this.cache.delete(CACHE_KEY)
  }
}

export const personalDetailsManager = new PersonalDetailsManager()
