/**
 * Тестирование эндпоинтов competitor-subscriptions
 */

const axios = require('axios')

const API_BASE = 'http://localhost:4000/api/competitor-subscriptions'

async function testEndpoints() {
  console.log('🧪 === ТЕСТИРОВАНИЕ COMPETITOR-SUBSCRIPTIONS API ===\n')

  try {
    // 1. Тест получения статистики
    console.log('📊 Тест 1: Получение статистики...')
    try {
      const statsResponse = await axios.get(`${API_BASE}/stats`)
      console.log('✅ Статистика получена:', {
        status: statsResponse.status,
        total_users: statsResponse.data.stats?.total_users,
        total_subscriptions: statsResponse.data.stats?.total_subscriptions,
      })
    } catch (error) {
      console.log(
        '❌ Ошибка получения статистики:',
        error.response?.status,
        error.message
      )
    }

    // 2. Тест создания подписки
    console.log('\n✉️ Тест 2: Создание новой подписки...')
    try {
      const createResponse = await axios.post(API_BASE, {
        user_telegram_id: '12345678',
        user_chat_id: '12345678',
        bot_name: 'test_bot',
        competitor_username: 'garyvee',
        competitor_display_name: 'Gary Vaynerchuk',
        max_reels: 5,
        min_views: 1000,
        max_age_days: 7,
        delivery_format: 'digest',
      })

      console.log('✅ Подписка создана:', {
        status: createResponse.status,
        subscription_id: createResponse.data.subscription?.id,
        competitor: createResponse.data.subscription?.competitor_username,
      })

      const subscriptionId = createResponse.data.subscription?.id

      // 3. Тест получения подписок пользователя
      console.log('\n📋 Тест 3: Получение подписок пользователя...')
      try {
        const getResponse = await axios.get(
          `${API_BASE}?user_telegram_id=12345678&bot_name=test_bot`
        )
        console.log('✅ Подписки получены:', {
          status: getResponse.status,
          subscriptions_count: getResponse.data.subscriptions?.length,
          first_subscription:
            getResponse.data.subscriptions?.[0]?.competitor_username,
        })
      } catch (error) {
        console.log(
          '❌ Ошибка получения подписок:',
          error.response?.status,
          error.message
        )
      }

      // 4. Тест обновления подписки
      if (subscriptionId) {
        console.log('\n🔄 Тест 4: Обновление подписки...')
        try {
          const updateResponse = await axios.put(
            `${API_BASE}/${subscriptionId}`,
            {
              max_reels: 8,
              delivery_format: 'individual',
            }
          )
          console.log('✅ Подписка обновлена:', {
            status: updateResponse.status,
            max_reels: updateResponse.data.subscription?.max_reels,
            delivery_format: updateResponse.data.subscription?.delivery_format,
          })
        } catch (error) {
          console.log(
            '❌ Ошибка обновления подписки:',
            error.response?.status,
            error.message
          )
        }

        // 5. Тест ручного запуска парсинга
        console.log('\n🚀 Тест 5: Ручной запуск парсинга...')
        try {
          const triggerResponse = await axios.post(
            `${API_BASE}/${subscriptionId}/trigger-parsing`
          )
          console.log('✅ Парсинг запущен:', {
            status: triggerResponse.status,
            message: triggerResponse.data.message,
            event_id: triggerResponse.data.event_id,
          })
        } catch (error) {
          console.log(
            '❌ Ошибка запуска парсинга:',
            error.response?.status,
            error.message
          )
        }

        // 6. Тест получения истории
        console.log('\n📈 Тест 6: Получение истории доставок...')
        try {
          const historyResponse = await axios.get(
            `${API_BASE}/${subscriptionId}/history`
          )
          console.log('✅ История получена:', {
            status: historyResponse.status,
            history_count: historyResponse.data.history?.length,
          })
        } catch (error) {
          console.log(
            '❌ Ошибка получения истории:',
            error.response?.status,
            error.message
          )
        }

        // 7. Тест удаления подписки
        console.log('\n🗑️ Тест 7: Удаление подписки...')
        try {
          const deleteResponse = await axios.delete(
            `${API_BASE}/${subscriptionId}`
          )
          console.log('✅ Подписка удалена:', {
            status: deleteResponse.status,
            message: deleteResponse.data.message,
          })
        } catch (error) {
          console.log(
            '❌ Ошибка удаления подписки:',
            error.response?.status,
            error.message
          )
        }
      }

      // 8. Итоговая статистика
      console.log('\n📊 Тест 8: Итоговая статистика...')
      try {
        const finalStatsResponse = await axios.get(`${API_BASE}/stats`)
        console.log('✅ Итоговая статистика:', {
          total_users: finalStatsResponse.data.stats?.total_users,
          total_subscriptions:
            finalStatsResponse.data.stats?.total_subscriptions,
          active_subscriptions:
            finalStatsResponse.data.stats?.active_subscriptions,
          unique_competitors: finalStatsResponse.data.stats?.unique_competitors,
        })
      } catch (error) {
        console.log(
          '❌ Ошибка получения итоговой статистики:',
          error.response?.status,
          error.message
        )
      }
    } catch (error) {
      console.log(
        '❌ Ошибка создания подписки:',
        error.response?.status,
        error.response?.data || error.message
      )
    }
  } catch (error) {
    console.error('💥 Критическая ошибка тестирования:', error.message)
  }

  console.log('\n🎯 === ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===')
}

// Запускаем тесты
testEndpoints().catch(console.error)
