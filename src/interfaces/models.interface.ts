export type ModelUrl = `${string}/${string}:${string}`

export interface GenerationResult {
  image: string | Buffer
  prompt_id: number
}

export interface UserModel {
  model_name: string
  trigger_word: string
  model_url: ModelUrl
  model_key?: ModelUrl
}

export type VideoModel = 'minimax' | 'haiper' | 'ray' | 'i2vgen-xl'
