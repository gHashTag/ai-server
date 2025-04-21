import { supabase } from '@/core/supabase'
import { CreateUserReturn, InviteT } from '@/interfaces/supabase.interface'

export async function createUser(
  usersData: InviteT
): Promise<CreateUserReturn> {
  const { telegram_id } = usersData
  console.log(telegram_id, 'telegram_id')

  // We check whether a user with the same telegram_id already exists
  const { data: existingUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegram_id)
    .maybeSingle()
  console.log(existingUser, 'existingUser')

  if (error) {
    console.error('Error checking user existence:', error)
    return {
      userData: [],
      user_id: '',
      isUserExist: false,
      error: error,
      telegram_id: usersData.telegram_id.toString(),
    }
  }

  if (existingUser) {
    console.log('User already exists', existingUser)
    return {
      userData: [existingUser],
      user_id: existingUser.user_id,
      isUserExist: true,
      error: null,
      telegram_id: existingUser.telegram_id.toString(),
    }
  }

  const { data, error: insertError } = await supabase
    .from('users')
    .insert([usersData])
    .select()

  console.log(data, 'data create')

  if (insertError) {
    console.error('Error creating user:', insertError)
    return {
      userData: [],
      user_id: '',
      isUserExist: false,
      error: insertError,
      telegram_id: usersData.telegram_id.toString(),
    }
  }

  if (!data || data.length === 0) {
    console.error('User data was not returned after insertion')
    return {
      userData: [],
      user_id: '',
      isUserExist: false,
      error: 'User data was not returned after insertion',
      telegram_id: usersData.telegram_id.toString(),
    }
  }

  return {
    userData: data,
    user_id: data[0].user_id,
    isUserExist: false,
    error: insertError,
    telegram_id: usersData.telegram_id.toString(),
  }
}
