import { supabase } from '.'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'

export type RoomInfoT = {
  __typename: string
  chat_id: string
  name: string
  type: string
  codes: string
}

export interface RoomNode {
  id: number
  created_at: string
  updated_at?: string | null
  workspace_id?: string | null
  type: string
  id_additional?: string | null
  name: string
  enabled?: boolean | null
  description?: string | null
  customer_id?: string | null
  app_id?: string | null
  recording_info?: string | null
  template_id?: string | null
  template?: string | null
  region?: string | null
  customer?: string | null
  large_room?: boolean | null
  codes: string
  type_additional?: string | null
  telegram_id?: string | null
  room_id: string
  language_code: string
  chat_id: number
  token?: string | null
  username: string
  original_name?: string | null
  public?: boolean | null
  rooms?: RoomInfoT
}

export interface UserPassport {
  telegram_id: string
  workspace_id: string
  room_id: string
  username: string
  first_name: string
  last_name: string
  chat_id: number
  type: 'room' | 'task' | 'workspace'
  is_owner: boolean
  photo_url?: string
  task_id?: string
  passport_id?: string
  recording_id?: string
  rooms?: RoomNode[]
}

export interface CheckPassportResult {
  passport?: UserPassport[]
  passport_id?: string
}

export interface CheckPassportIsExistingResult {
  isExistingPassport: boolean
  passport?: UserPassport[]
  passport_id?: string
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
  bot_name: string
}

export async function setPassport(
  passport: PassportUser
): Promise<string | Response> {
  try {
    const { data, error } = await supabase
      .from('user_passport')
      .insert(passport)
      .select('*')

    if (error) {
      errorMessageAdmin(error)
      throw new Error('Error setPassport: ' + error)
    }

    const passport_id = data && data[0].passport_id
    return passport_id
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('Error setPassport: ' + error)
  }
}

interface CreatePassport {
  type: 'room' | 'task' | 'workspace'
  select_izbushka: number
  first_name: string
  last_name: string
  username: string
  telegram_id: string
  is_owner: boolean
  recording_id: string
  task_id: string
}

export async function createPassport({
  type,
  select_izbushka,
  first_name,
  last_name,
  username,
  telegram_id,
  is_owner,
  task_id,
  recording_id,
}: CreatePassport): Promise<CheckPassportResult> {
  try {
    const { data: dataRoom, error: errorRoom } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', select_izbushka)
      .single()
    console.log(dataRoom, 'dataRoom')
    if (errorRoom) {
      errorMessageAdmin(errorRoom)
      throw new Error(errorRoom.message)
    }

    const passport: UserPassport[] = [
      {
        username,
        telegram_id,
        workspace_id: dataRoom.workspace_id,
        room_id: dataRoom.room_id,
        first_name,
        last_name,
        type,
        is_owner,
        task_id,
        recording_id,
        photo_url: '',
        chat_id: dataRoom.chat_id,
      },
    ]
    console.log(passport, 'checkPassport passport')
    const { data: dataPassport, error: errorPassport } = await supabase
      .from('user_passport')
      .insert(passport)
      .select('*')
    console.log(dataPassport, 'checkPassport dataPassport')
    if (errorPassport) {
      errorMessageAdmin(errorPassport)
      throw new Error(errorPassport.message)
    }
    return {
      passport: dataPassport,
      passport_id: dataPassport[0].passport_id,
    }
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('throw createPassport: ' + error)
  }
}

export const checkPassport = async (
  telegram_id: string,
  workspace_id: string,
  room_id: string,
  task_id?: string
): Promise<CheckPassportIsExistingResult> => {
  try {
    console.log(
      telegram_id,
      workspace_id,
      room_id,
      task_id,
      'telegram_id, workspace_id, room_id, task_id'
    )
    const { data: existingPassport, error } = await supabase
      .from('user_passport')
      .select('*')
      .eq('telegram_id', telegram_id)
      .eq('workspace_id', workspace_id)
      .eq('room_id', room_id)
      .eq('task_id', task_id)
      .eq('is_owner', false)
      .single()
    console.log(existingPassport, 'existingPassport')
    if (error) {
      errorMessageAdmin(error)
      throw new Error('Error checkPassport: ' + error)
    }
    if (existingPassport) {
      return {
        isExistingPassport: true,
        passport: existingPassport,
        passport_id: existingPassport.passport_id,
      }
    } else {
      return {
        isExistingPassport: false,
      }
    }
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('Error checkPassport: ' + error)
  }
}

export async function getPassportByRoomId(
  room_id: string
): Promise<PassportUser[]> {
  try {
    const { data, error } = await supabase
      .from('user_passport')
      .select(
        `
      *,
      rooms(chat_id)
    `
      )
      .eq('room_id', room_id)
      .eq('type', 'room')
      .eq('is_owner', true)

    if (error) {
      errorMessageAdmin(error)
    }

    if (data === null) {
      errorMessageAdmin(new Error('No data returned from select'))
      throw new Error('No data returned from select')
    }

    return data
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('Error getPassportByRoomId: ' + error)
  }
}

export async function getPassportsTasksByUsername(
  username: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_passport')
      .select('*')
      .eq('username', username)
      .eq('type', 'task')

    if (error) {
      errorMessageAdmin(error)
      throw new Error(
        'Error getPassportsTasksByUsername: ' + JSON.stringify(error)
      )
    }

    return data.map(item => item.task_id)
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('Error getPassportsTasksByUsername: ' + error)
  }
}

export async function checkPassportByRoomId(
  telegram_id: string,
  room_id: string,
  type: 'room' | 'task' | 'workspace'
): Promise<boolean | Response> {
  try {
    const { data, error } = await supabase
      .from('user_passport')
      .select('*')
      .eq('telegram_id', telegram_id)
      .eq('room_id', room_id)
      .eq('type', type)

    if (error) {
      errorMessageAdmin(error)
      throw new Error('Error checkPassportByRoomId: ' + error)
    }

    return data && data.length > 0
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('Error checkPassportByRoomId: ' + error)
  }
}
