import { supabase } from '@/core/supabase'

export const checkUsernameCodesByUserId = async (
  user_id: string
): Promise<{
  isInviterExist: boolean
  invitation_codes: string
  inviter_user_id: string
  error?: boolean
}> => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)

    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('user_id', user_id)

    if (roomsError) {
      console.error(roomsError, 'roomsError')
    }
    const invitation_codes = rooms && rooms[0]?.codes

    if (userError) {
      return {
        isInviterExist: false,
        invitation_codes: '',
        error: true,
        inviter_user_id: '',
      }
    }

    return {
      isInviterExist: userData.length > 0 ? true : false,
      invitation_codes,
      inviter_user_id: userData[0].user_id,
    }
  } catch (error) {
    console.error(error, 'error checkUsernameCodes')
    return {
      isInviterExist: false,
      invitation_codes: '',
      error: true,
      inviter_user_id: '',
    }
  }
}
