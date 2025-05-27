import { supabase } from '../drizzle-supabase'
import { NewPayment, Payment, createPaymentApiSchema } from '../schema/payments'

export class DrizzlePaymentsOperations {
  async insert(paymentData: NewPayment): Promise<Payment> {
    // Валидация через Zod
    const validatedData = createPaymentApiSchema.parse(paymentData)

    const { data, error } = await supabase
      .from('payments_v2')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to insert payment: ${error.message}`)
    }

    return data as Payment
  }

  async findByTelegramId(telegramId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to find payments: ${error.message}`)
    }

    return data as Payment[]
  }

  async getUserBalance(telegramId: string): Promise<number> {
    // Используем существующую SQL функцию get_user_balance
    const { data: balance, error } = await supabase.rpc('get_user_balance', {
      user_telegram_id: telegramId.toString(),
    })

    if (error) {
      throw new Error(`Failed to get user balance: ${error.message}`)
    }

    return balance || 0
  }

  async delete(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments_v2')
      .delete()
      .eq('id', paymentId)

    if (error) {
      throw new Error(`Failed to delete payment: ${error.message}`)
    }
  }

  async findById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to find payment: ${error.message}`)
    }

    return data as Payment
  }

  async update(id: string, updateData: Partial<NewPayment>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments_v2')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`)
    }

    return data as Payment
  }
}

export const drizzlePayments = new DrizzlePaymentsOperations()
