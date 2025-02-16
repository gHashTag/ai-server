import { createCodes } from '../core/100ms/create-codes'
import { setMyWorkspace } from '../core/supabase/setMyWorkspace'
import { myHeaders } from '../core/100ms/my-headers'
import { supabase } from '../core/supabase'
import { transliterate } from '@/helpers'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'

const createToken100ms = () => {
  return new Promise((resolve, reject) => {
    const { APP_ACCESS_KEY, APP_SECRET } = process.env
    const payload = {
      access_key: APP_ACCESS_KEY,
      type: 'management',
      version: 2,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
    }

    jwt.sign(
      payload,
      APP_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '24h',
        jwtid: uuidv4(),
      },
      (err: any, token: string) => {
        if (err) {
          reject(err)
        } else {
          resolve(token)
        }
      }
    )
  })
}

type CreateOrFetchRoomProps = {
  name: string
  type: string
  telegram_id: string
  token: string
  chat_id: string
}

export const createOrFetchRoom = async ({
  name,
  type,
  telegram_id,
  token,
  chat_id,
}: CreateOrFetchRoomProps) => {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegram_id)

  if (!data) {
    throw new Error(`User not found: ${telegram_id}`)
  }

  const workspace_id = await setMyWorkspace(telegram_id)
  if (!workspace_id) {
    throw new Error('Failed to create or fetch workspace')
  }

  // Проверяем, существует ли уже комната с таким именем
  const { data: existingRoom } = await supabase
    .from('rooms')
    .select('room_id')
    .eq('name', name)
    .single()

  if (existingRoom) {
    console.log(
      `Room with name "${name}" already exists. Returning existing room_id.`
    )
    return existingRoom
  }
  const transliterateName = transliterate(name)
  const roomData = {
    name: `${transliterateName}`,
    description: workspace_id,
    template_id:
      type === 'audio-space'
        ? '65e84b5148b3dd31b94ff005'
        : '65efdfab48b3dd31b94ff0dc',
    enabled: true,
  }

  const roomResponse = await fetch('https://api.100ms.live/v2/rooms', {
    method: 'POST',
    body: JSON.stringify({ ...roomData }),
    headers: { ...myHeaders },
  })

  if (!roomResponse.ok) {
    throw new Error(`Failed to create room: ${roomResponse.statusText}`)
  }

  const newRoom = await roomResponse.json()
  console.log('newRoom:', newRoom)
  const id = newRoom.id
  const codesResponse = await createCodes(id)

  if (!codesResponse?.ok) {
    throw new Error(`Failed to create codes: ${codesResponse.statusText}`)
  }

  const codes = await codesResponse.json()
  console.log('codes:', codes)

  const rooms = {
    workspace_id,
    type,
    id_additional: null,
    name: newRoom.name,
    enabled: newRoom.enabled,
    description: newRoom.description,
    customer_id: newRoom.customer_id,
    app_id: newRoom.app_id,
    recording_info: newRoom.recording_info,
    template_id: newRoom.template_id,
    region: newRoom.region,
    customer: newRoom.customer,
    large_room: newRoom.large_room,
    codes,
    type_additional: null,
    language_code: data[0].language_code,
    chat_id,
    username: data[0].username,
    original_name: name,
    public: false,
    created_at: new Date(newRoom.created_at),
    updated_at: new Date(newRoom.updated_at),
    template: newRoom.template,
    room_id: newRoom.id,
    telegram_id,
    token,
  }

  console.log('Inserting room:', rooms)

  const { error } = await supabase.from('rooms').insert({
    ...rooms,
    id: undefined,
  })

  if (error) {
    console.error('Error saving to Supabase:', error)
    throw new Error(`Error saving to Supabase: ${error.message}`)
  }

  return rooms
}
