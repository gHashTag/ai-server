#!/usr/bin/env bun

/**
 * Генерирует SQL для добавления всех остальных расходов за май 2024
 */

const remainingExpenses = [
  {
    date: '02/05',
    name: 'PINECONE SYSTEMS, IN',
    amount: 40.19,
    currency: 'THB',
    description: 'Векторная база данных',
    purpose: 'Хранение и управление векторными данными для AI приложений.',
    url: 'Pinecone',
    category: 'INFRASTRUCTURE',
    expenseType: 'DATABASE'
  },
  {
    date: '02/05',
    name: 'WARP.DEV',
    amount: 1726.61,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Оптимизация процессов разработки и тестирования приложений.',
    url: 'Warp',
    category: 'DEVELOPMENT',
    expenseType: 'DEVELOPMENT_TOOLS'
  },
  {
    date: '03/05',
    name: 'REPLICATE',
    amount: 6088.40,
    currency: 'THB',
    description: 'Хостинг моделей',
    purpose: 'Хостинг моделей для генерации изображений и других AI задач.',
    url: 'Replicate',
    category: 'AI_SERVICES',
    expenseType: 'IMAGE_GENERATION'
  },
  {
    date: '03/05',
    name: 'WISPR',
    amount: 517.37,
    currency: 'THB',
    description: 'AI сообщения',
    purpose: 'Автоматизация общения с пользователями через AI.',
    url: 'Wispr',
    category: 'AI_SERVICES',
    expenseType: 'AI_API'
  },
  {
    date: '05/05',
    name: 'CURSOR USAGE MID MA',
    amount: 689.83,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Используется для оптимизации процессов разработки.',
    url: 'Cursor',
    category: 'DEVELOPMENT',
    expenseType: 'DEVELOPMENT_TOOLS'
  },
  {
    date: '08/05',
    name: 'ELEVENLABS',
    amount: 741.22,
    currency: 'THB',
    description: 'Генерация голоса',
    purpose: 'Создание реалистичных голосов для озвучивания контента.',
    url: 'ElevenLabs',
    category: 'AI_SERVICES',
    expenseType: 'VOICE_GENERATION'
  },
  {
    date: '21/05',
    name: 'RUNWAY UNLIMITED PLA',
    amount: 3211.43,
    currency: 'THB',
    description: 'AI генерация видео',
    purpose: 'Генерация видео для визуализации контента.',
    url: 'Runway',
    category: 'AI_SERVICES',
    expenseType: 'VIDEO_GENERATION'
  }
  // Можно добавить остальные по необходимости
]

function generateInsertSQL(expenses: any[]): string {
  const values = expenses.map(expense => {
    const invId = `farm_expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const paymentDate = `2024-05-${expense.date.split('/')[0].padStart(2, '0')}`
    
    return `(
      '${invId}',
      'SYSTEM_BOT_FARM',
      'bot_farm_manager',
      ${expense.amount},
      0,
      '${expense.currency}',
      'COMPLETED',
      'MONEY_OUTCOME',
      'System',
      '${expense.name}: ${expense.description.replace(/'/g, "''")}',
      '{"expense_category": "${expense.category}", "expense_type": "${expense.expenseType}", "purpose": "${expense.purpose.replace(/'/g, "''")}", "original_name": "${expense.name}", "url": "${expense.url}", "is_bot_farm_expense": true, "processed_at": "${new Date().toISOString()}"}',
      NULL,
      NULL,
      '${paymentDate}T00:00:00.000Z',
      NOW(),
      NOW()
    )`
  }).join(',\n')

  return `
INSERT INTO payments_v2 (
  inv_id,
  telegram_id,
  bot_name,
  amount,
  stars,
  currency,
  status,
  type,
  payment_method,
  description,
  metadata,
  subscription_type,
  service_type,
  payment_date,
  created_at,
  updated_at
) VALUES ${values};
`
}

async function main() {
  console.log('🚀 Генерируем SQL для остальных расходов фермы ботов...')
  
  const sql = generateInsertSQL(remainingExpenses)
  const totalAmount = remainingExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  console.log('📝 Сгенерированный SQL:')
  console.log('='.repeat(60))
  console.log(sql)
  console.log('='.repeat(60))
  
  console.log(`\n📊 Статистика:`)
  console.log(`   Количество записей: ${remainingExpenses.length}`)
  console.log(`   Общая сумма: ${totalAmount.toFixed(2)} THB`)
  
  console.log('\n📋 Инструкции:')
  console.log('1. Скопируйте SQL выше')
  console.log('2. Вставьте в Supabase SQL Editor')
  console.log('3. Выполните SQL')
  console.log('4. Проверьте итоговую статистику:')
  console.log('   SELECT COUNT(*), SUM(amount) FROM payments_v2 WHERE telegram_id = \'SYSTEM_BOT_FARM\';')
}

main().catch(console.error)