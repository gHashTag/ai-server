export type ApiResponse = string | string[] | { output: string }

export interface ApiImageResponse {
  data: {
    image: string
    prompt_id: string
  }
  message: string
}
