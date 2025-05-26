require('dotenv').config()
const { supabase } = require('../dist/core/supabase/index.js')

async function checkUserModels(telegramId) {
  try {
    console.log(`🔍 Проверка моделей для пользователя ${telegramId}...`)

    const { data, error } = await supabase
      .from('model_trainings')
      .select('model_url, status, created_at, model_name')
      .eq('telegram_id', telegramId.toString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('❌ Ошибка запроса:', error)
      return
    }

    console.log(`📊 Найдено записей: ${data.length}`)

    if (data.length === 0) {
      console.log('❌ У пользователя нет записей в model_trainings')
      return
    }

    console.log('📋 Все модели пользователя:')
    data.forEach((model, index) => {
      console.log(
        `${index + 1}. ${model.model_name} - ${model.status} (${
          model.created_at
        })`
      )
      if (model.model_url) {
        console.log(`   URL: ${model.model_url}`)
      }
    })

    // Проверяем успешные модели
    const successModels = data.filter(m => m.status === 'SUCCESS')
    console.log(`\n✅ Успешных моделей: ${successModels.length}`)

    if (successModels.length > 0) {
      const latest = successModels[0]
      console.log(`🎯 Последняя успешная модель: ${latest.model_name}`)
      console.log(`🔗 URL: ${latest.model_url}`)
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}

// Проверяем пользователя 144022504
checkUserModels('144022504')
