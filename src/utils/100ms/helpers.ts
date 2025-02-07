import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/core/supabase'
import { NEXT_PUBLIC_MANAGEMENT_TOKEN } from '@/config'

type CreateOrFetchRoomProps = {
  username: string
  first_name: string
  last_name: string
  language_code: string
  user_id: string
  chat_id: number
  workspace_id: string
  bot_name: string
}

export const createOrFetchRoom = async ({
  username,
  first_name,
  last_name,
  language_code,
  user_id,
  chat_id,
  workspace_id,
  bot_name,
}: CreateOrFetchRoomProps) => {
  const roomData = {
    name: `${username}:${uuidv4()}:${language_code}`,
    description: workspace_id,
    template_id: '65efdfab48b3dd31b94ff0dc',
    enabled: true,
  }

  const roomResponse = await fetch('https://api.100ms.live/v2/rooms', {
    method: 'POST',
    body: JSON.stringify({ ...roomData }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NEXT_PUBLIC_MANAGEMENT_TOKEN}`,
    },
  })

  if (!roomResponse.ok) {
    throw new Error(`Failed to create room: ${roomResponse.statusText}`)
  }
  const newRoom = await roomResponse.json()
  console.log('newRoom', newRoom)

  const room_id = newRoom.id

  const codesResponse = await createCodes(
    room_id,
    NEXT_PUBLIC_MANAGEMENT_TOKEN as string
  )

  console.log('codesResponse', codesResponse)

  if (!codesResponse?.ok) {
    throw new Error(`Failed to create codes: ${codesResponse.statusText}`)
  }
  const codes = await codesResponse.json()

  console.log('codes', codes)

  const rooms = {
    ...newRoom,
    codes,
    type: 'video-space',
    name: `${first_name} ${last_name}`,
    updated_at: new Date(),
    user_id,
    room_id,
    token: bot_name,
    chat_id,
    username,
    workspace_id,
    language_code,
  }

  delete rooms.id

  const { data: roomDataSupabase, error: roomErrorSupabase } = await supabase
    .from('rooms')
    .insert({
      ...rooms,
    })
    .select()
    .single()
  console.log('roomDataSupabase', roomDataSupabase)
  if (roomErrorSupabase) {
    throw new Error(`Error saving to Supabase: ${roomErrorSupabase.message}`)
  }

  return roomDataSupabase
}

export async function createCodes(room_id: string, token: string) {
  try {
    const response = await fetch(
      `https://api.100ms.live/v2/room-codes/room/${room_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      }
    )

    console.log('response createCodes', response)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  } catch (error) {
    console.error('Error creating codes:', error)
    throw error
  }
}
