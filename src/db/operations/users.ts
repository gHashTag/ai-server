import { supabase } from '../drizzle-supabase'
import { NewUser, User, createUserApiSchema } from '../schema/users'

export class DrizzleUsersOperations {
  async insert(userData: NewUser): Promise<User> {
    // Валидация через Zod
    const validatedData = createUserApiSchema.parse(userData)

    const { data, error } = await supabase
      .from('users')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to insert user: ${error.message}`)
    }

    return data as User
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw new Error(`Failed to find user: ${error.message}`)
    }

    return data as User
  }

  async update(
    telegramId: string,
    updateData: Partial<Omit<NewUser, 'telegram_id'>>
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('telegram_id', telegramId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return data as User
  }

  async delete(telegramId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('telegram_id', telegramId)

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }
}

export const drizzleUsers = new DrizzleUsersOperations()
