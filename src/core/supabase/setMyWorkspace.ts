import { supabase } from '.'

export async function setMyWorkspace(user_id: string) {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .insert([
        {
          title: 'Fire',
          user_id,
        },
      ])
      .select('*')

    if (error) console.log(error, 'setMyWorkspace error:::')
    const workspace_id = data && data[0].workspace_id
    return workspace_id
  } catch (error) {
    console.error('Error setting my workspace:', error)
    return null
  }
}
