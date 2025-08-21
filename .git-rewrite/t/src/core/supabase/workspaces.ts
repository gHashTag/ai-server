import { WorkspaceNode } from '@/interfaces/supabase.interface'
import { supabase } from './'

export async function getWorkspaceById(
  workspace_id: string
): Promise<WorkspaceNode[]> {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('workspace_id', workspace_id)
    console.log(error, 'error')
    if (error) {
      throw new Error(error.message)
    }
    return data as WorkspaceNode[]
  } catch (error) {
    console.error(error, 'error getWorkspaceById')
    throw new Error(error.message)
  }
}

export async function getWorkspaceByName(
  name: string
): Promise<WorkspaceNode[]> {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('name', name)
    console.log(error, 'error')
    if (error) {
      throw new Error(error.message)
    }
    return data as WorkspaceNode[]
  } catch (error) {
    throw new Error(error.message)
  }
}
