export type InviteT = {
  username: string
  first_name: string
  last_name: string
  is_bot: boolean
  language_code: string
  inviter: string
  invitation_codes: string
  telegram_id: number
  email?: string
  photo_url?: string
}

export type TSupabaseUser = {
  inviter?: string | null
  is_bot?: boolean | null
  language_code?: string | null
  email?: string | null
  created_at?: Date
  telegram_id?: string
  aggregateverifier?: string | null
  admin_email?: string | null
  role?: string | null
  display_name?: string | null
  select_izbushka?: string | null
}

export type TUser = Readonly<{
  auth_date?: number
  first_name: string
  last_name?: string
  hash?: string
  id?: number
  photo_url?: string
  username?: string
}>

export type SupabaseUser = TUser & TSupabaseUser

export type CreateUserReturn = {
  userData: SupabaseUser[]
  telegram_id: string
  isUserExist: boolean
  user_id: string
  error: any
}

export interface CreateUserData {
  username: string
  telegram_id: string
  first_name: string
  last_name: string
  is_bot: boolean
  language_code: string
  photo_url: string
  chat_id: number
  mode: string
  model: string
  count: number
  aspect_ratio: string
  balance: number
  inviter: string | null
}

export interface ModelTraining {
  model_name: string
  trigger_word: string
  model_url: string
}
export type Subscription =
  | 'neuromeeting'
  | 'neuroblogger'
  | 'neurotester'
  | 'neurophoto'
  | 'neuromentor'
  | 'stars'
  | 'neurovideo'

export interface UserType {
  id: bigint
  created_at: Date
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  is_bot?: boolean | null
  language_code?: string | null
  telegram_id?: bigint | null
  email?: string | null
  photo_url?: string | null
  role?: string | null
  display_name?: string | null
  user_timezone?: string | null
  designation?: string | null
  position?: string | null
  company?: string | null
  invitation_codes?: Record<string, any> | null // JSON
  select_izbushka?: bigint | null
  avatar_id?: string | null
  voice_id?: string | null
  voice_id_elevenlabs?: string | null
  chat_id?: bigint | null
  voice_id_synclabs?: string | null
  mode?: string | null
  model?: string | null
  count?: bigint | null
  aspect_ratio?: string | null
  balance?: number | null
  inviter?: string | null // UUID
  vip?: boolean | null
  subscription?: string | null
  token?: string | null
  is_leela_start?: boolean | null
}

export interface PassportUser {
  telegram_id: string
  workspace_id: string
  room_id: string
  username: string
  first_name: string
  last_name: string
  chat_id: number
  type: 'room'
  is_owner: boolean
  photo_url: string | null
  rooms?: { chat_id: string }
}

export interface RoomAsset {
  account_id: string
  app_id: string
  duration: number
  metadata_id: string
  metadata_timestamp: string
  recording_id: string
  room_id: string
  room_name: string
  session_id: string
  summary_json_asset_id: string
  summary_json_path: string
  summary_json_presigned_url: string
  transcript_json_asset_id: string
  transcript_json_path: string
  transcript_json_presigned_url: string
  transcript_srt_asset_id: string
  transcript_srt_path: string
  transcript_srt_presigned_url: string
  transcript_txt_asset_id: string
  transcript_txt_path: string
  transcript_txt_presigned_url: string
  transcription_id: string
}

export interface TranscriptionAsset extends RoomAsset {
  title: string
  summary_short: string
  transcription: string
  telegram_id: string
  workspace_id: string
}

// WORKSPACES

export interface WorkspaceNode {
  background: string
  colors: string[][]
  created_at: string
  id: string
  title: string
  type: string
  updated_at: string
  telegram_id: string
  workspace_id: string
}
