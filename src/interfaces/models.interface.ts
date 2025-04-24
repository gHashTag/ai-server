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

export type VideoModel =
  | 'minimax'
  // | 'haiper' // Закомментировано или удалить, т.к. используется haiper-video-2
  | 'ray'
  | 'ray_v2'
  | 'i2vgen-xl'
  | 'wan-2.1'
  | 'kling-v1.6-pro'
  | 'hunyuan-video-fast'
  | 'haiper-video-2' // Используем этот ID
  | 'wan-2.1-i2v-720p'
