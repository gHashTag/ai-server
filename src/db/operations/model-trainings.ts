import { supabase } from '../drizzle-supabase'
import {
  NewModelTraining,
  ModelTraining,
  createModelTrainingApiSchema,
} from '../schema/model-trainings'

export class DrizzleModelTrainingsOperations {
  async insert(trainingData: NewModelTraining): Promise<ModelTraining> {
    // Валидация через Zod
    const validatedData = createModelTrainingApiSchema.parse(trainingData)

    const { data, error } = await supabase
      .from('model_trainings')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to insert model training: ${error.message}`)
    }

    return data as ModelTraining
  }

  async findByTelegramId(telegramId: string): Promise<ModelTraining[]> {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to find model trainings: ${error.message}`)
    }

    return data as ModelTraining[]
  }

  async findById(id: string): Promise<ModelTraining | null> {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to find model training: ${error.message}`)
    }

    return data as ModelTraining
  }

  async findByReplicateId(replicateId: string): Promise<ModelTraining | null> {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('replicate_training_id', replicateId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(
        `Failed to find model training by replicate ID: ${error.message}`
      )
    }

    return data as ModelTraining
  }

  async update(
    id: string,
    updateData: Partial<NewModelTraining>
  ): Promise<ModelTraining> {
    const { data, error } = await supabase
      .from('model_trainings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update model training: ${error.message}`)
    }

    return data as ModelTraining
  }

  async updateByReplicateId(
    replicateId: string,
    updateData: Partial<NewModelTraining>
  ): Promise<ModelTraining> {
    const { data, error } = await supabase
      .from('model_trainings')
      .update(updateData)
      .eq('replicate_training_id', replicateId)
      .select()
      .single()

    if (error) {
      throw new Error(
        `Failed to update model training by replicate ID: ${error.message}`
      )
    }

    return data as ModelTraining
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('model_trainings')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete model training: ${error.message}`)
    }
  }

  async getTrainingWithUser(telegramId: string, modelName: string) {
    // Получаем тренировку
    const { data: training, error: trainingError } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('model_name', modelName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (trainingError) {
      throw new Error(`Failed to get training: ${trainingError.message}`)
    }

    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (userError) {
      throw new Error(`Failed to get user: ${userError.message}`)
    }

    // Объединяем данные
    return {
      ...training,
      user_id: user.id,
      user_username: user.username,
      user_first_name: user.first_name,
      user_last_name: user.last_name,
      user_gender: user.gender,
      user_bot_name: user.bot_name,
    }
  }
}

export const drizzleModelTrainings = new DrizzleModelTrainingsOperations()
