import { supabase } from '.'

export async function setPassport(passport: any) {
  try {
    const { data, error } = await supabase
      .from('user_passport')
      .insert(passport)
      .select('*')

    if (error) console.log('setPassport error:::', error)
    const passport_id = data && data[0].passport_id
    return passport_id
  } catch (error) {
    console.error('Error setting passport:', error)
    return null
  }
}
