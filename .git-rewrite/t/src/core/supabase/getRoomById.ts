import { supabase } from '@/core/supabase'
import { RoomNode } from '@/core/supabase/passport'

export const getRoomById = async (
  room_id: string
): Promise<{
  roomData?: RoomNode
  isExistRoom: boolean
}> => {
  console.log(room_id, 'room_id')
  try {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', room_id)
      .single()

    if (roomError) {
      throw new Error('Error getRoomById: ' + roomError.message)
    }

    if (!roomData) {
      console.log('Room not found')
      return {
        isExistRoom: false,
      }
    }
    console.log(roomData, 'roomData')
    return {
      roomData,
      isExistRoom: true,
    }
  } catch (error) {
    console.error('Error getRoomById:', error)
    throw new Error('Error getRoomById: ' + error.message)
  }
}
