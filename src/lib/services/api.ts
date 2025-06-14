const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API request failed')
  }

  const result = await response.json()
  if (result.status !== 'success' || result.errors) {
    throw new Error(result.errors || 'Operation failed')
  }

  return result.data
}

export const api = {
  post: async <TRequest, TResponse = TRequest>(
    url: string,
    data: TRequest
  ): Promise<TResponse> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    return handleResponse(response)
  },
}
