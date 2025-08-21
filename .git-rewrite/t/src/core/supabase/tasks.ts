import { supabase } from '@/core/supabase'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'

interface CreateTask {
  telegram_id: string
  room_id: string
  workspace_id: string
  recording_id: string
  title: string
  description: string
  workspace_name: string
  chat_id: number
  translated_text: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived'

export type TaskNode = {
  id: string
  telegram_id: string
  created_at: string
  title: string
  description: string
  updated_at?: string
  due_date?: string
  priority?: string
  assigned_to?: string
  label?: string[]
  completed_at?: string
  is_archived?: boolean
  status: TaskStatus
  order: number
  background: string
  colors: string[][]
  type: string
  workspace_id: string
  cost: string
  is_public: boolean
  translated_text: string
}

export const createTask = async ({
  telegram_id,
  room_id,
  workspace_id,
  recording_id,
  title,
  description,
  workspace_name,
  chat_id,
  translated_text,
}: CreateTask): Promise<TaskNode> => {
  try {
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert([
        {
          telegram_id,
          room_id,
          workspace_id,
          recording_id,
          title,
          description,
          workspace_name,
          chat_id,
          translated_text,
        },
      ])
      .select('*')

    if (taskError) {
      errorMessageAdmin(taskError)
      throw new Error('Error createTask: ' + taskError)
    }

    if (!taskData || taskData.length === 0) {
      errorMessageAdmin(new Error('Task not found'))
      throw new Error('Task not found')
    }

    return taskData[0]
  } catch (error) {
    errorMessageAdmin(error)
    throw new Error('Error createTask: ' + error)
  }
}

export const updateTaskByPassport = async ({
  id,
  passport_id,
}: {
  id: string
  passport_id: string
}) => {
  console.log(id, 'id')
  console.log(passport_id, 'passport_id')

  const { data: updateTaskData, error: updateTaskError } = await supabase
    .from('tasks')
    .update({ passport_id })
    .eq('id', id)
    .select('*')

  if (updateTaskError) {
    errorMessageAdmin(updateTaskError)
    throw new Error('Error updateTaskByPassport: ' + updateTaskError)
  }

  return updateTaskData
}
