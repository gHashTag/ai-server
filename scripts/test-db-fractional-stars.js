#!/usr/bin/env node

/**
 * Тест для проверки что база данных сохраняет дробные значения звезд
 * После миграции numeric(10,2) должно работать
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testFractionalStars() {
  console.log('🧪 Тест сохранения дробных значений звезд в БД\n')

  const testInvId = `test_fractional_${Date.now()}`
  const testTelegramId = '999999999'
  const testStars = 7.5

  try {
    console.log('📝 Вставляем тестовую запись с 7.5⭐...')

    // Вставляем тестовую запись
    const { error: insertError } = await supabase.from('payments_v2').insert({
      telegram_id: testTelegramId,
      inv_id: testInvId,
      currency: 'STARS',
      amount: testStars,
      status: 'COMPLETED',
      stars: testStars, // 7.5 - дробное значение
      type: 'MONEY_OUTCOME',
      description: 'Тест дробных звезд после миграции',
      payment_method: 'Internal',
      bot_name: 'test_bot',
      language: 'ru',
      payment_date: new Date(),
    })

    if (insertError) {
      console.error('❌ Ошибка при вставке:', insertError.message)
      return
    }

    console.log('✅ Запись вставлена успешно')

    // Читаем что сохранилось
    console.log('🔍 Читаем сохранённое значение...')

    const { data, error: selectError } = await supabase
      .from('payments_v2')
      .select('stars, description, created_at')
      .eq('inv_id', testInvId)
      .single()

    if (selectError) {
      console.error('❌ Ошибка при чтении:', selectError.message)
      return
    }

    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТА:')
    console.log('='.repeat(40))
    console.log(`Вставили: ${testStars}⭐`)
    console.log(`Сохранилось: ${data.stars}⭐`)
    console.log(`Тип: ${typeof data.stars}`)

    if (data.stars === testStars) {
      console.log('✅ УСПЕХ! Дробные значения сохраняются корректно!')
      console.log('✅ Миграция numeric(10,2) работает!')
      console.log('✅ NeuroPhoto теперь будет списывать ровно 7.5⭐!')
    } else {
      console.log('❌ ПРОБЛЕМА! Значение изменилось при сохранении!')
      console.log(
        '❌ Возможно миграция не применилась или есть другая проблема'
      )
    }

    // Удаляем тестовую запись
    console.log('\n🧹 Удаляем тестовую запись...')
    const { error: deleteError } = await supabase
      .from('payments_v2')
      .delete()
      .eq('inv_id', testInvId)

    if (deleteError) {
      console.error(
        '⚠️ Не удалось удалить тестовую запись:',
        deleteError.message
      )
    } else {
      console.log('✅ Тестовая запись удалена')
    }
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error.message)
  }
}

testFractionalStars()
