export const ResponseType = {
  JSON: 'json',
  BLOB: 'blob',
} as const

type ResponseTypeValue = (typeof ResponseType)[keyof typeof ResponseType]

interface PostOptions {
  signal?: AbortSignal
  responseType?: ResponseTypeValue
}

const handleResponse = async <T>(
  response: Response,
  responseType: ResponseTypeValue = ResponseType.JSON
): Promise<T> => {
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API request failed')
  }

  if (responseType === ResponseType.BLOB) {
    return response.blob() as T
  }

  const result = await response.json()
  if (!result.success || result.errors) {
    throw new Error(result.errors || 'Operation failed')
  }

  return result.data as T
}

export const api = {
  post: async <TRequest, TResponse = TRequest>(
    url: string,
    data: TRequest,
    options: PostOptions = {}
  ): Promise<TResponse> => {
    const { signal, responseType = ResponseType.JSON } = options

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal,
    })

    return handleResponse(response, responseType)
  },
}
