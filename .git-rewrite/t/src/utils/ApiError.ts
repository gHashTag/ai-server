class ApiError extends Error {
  public response: any

  constructor(message: string, response: any) {
    super(message)
    this.name = 'ApiError'
    this.response = response
  }
}

export default ApiError
