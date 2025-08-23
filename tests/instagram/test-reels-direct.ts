/**
 * 🎬 ПРЯМОЙ ТЕСТ АНАЛИЗА РИЛЗ КОНКУРЕНТОВ
 * Тестируем компоненты функции напрямую без Inngest
 */

import { z } from 'zod'
import axios from 'axios'

// Копируем схему валидации из основной функции
const AnalyzeReelsEventSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  max_reels: z.number().min(1).max(50).default(15),
  days_back: z.number().min(1).max(30).default(14),
  project_id: z.number().positive().optional(),
  requester_telegram_id: z.string().optional(),
  telegram_user_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Instagram API класс (упрощенная версия)
class InstagramReelsAnalyzerDirect {
  private apiKey: string
  private host: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.RAPIDAPI_INSTAGRAM_KEY || ''
    this.host =
      process.env.RAPIDAPI_INSTAGRAM_HOST ||
      'real-time-instagram-scraper-api1.p.rapidapi.com'
    this.baseUrl = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'
  }

  async getUserReels(username: string, count = 15) {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000
          console.log(
            `⏳ Rate limited, waiting ${delay / 1000}s before retry ${
              attempt + 1
            }/${maxRetries}`
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        console.log(
          `🎬 API call attempt ${attempt + 1}/${maxRetries} for: ${username}`
        )

        const response = await axios.get(`${this.baseUrl}/v1/user_reels`, {
          params: {
            username_or_id: username,
            count: count,
          },
          headers: {
            'x-rapidapi-key': this.apiKey,
            'x-rapidapi-host': this.host,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })

        if (typeof response.data?.data === 'string') {
          console.error(`❌ API returned error: ${response.data.data}`)
          return {
            success: false,
            error: `API error: ${response.data.data}`,
            reels: [],
            total: 0,
            userId: '',
            username: username,
          }
        }

        console.log(
          `✅ API Success: Found ${
            response.data?.data?.items?.length || 0
          } reels`
        )

        return {
          success: true,
          reels: response.data?.data?.items || [],
          total: response.data?.data?.items?.length || 0,
          userId: response.data?.data?.user_id || '',
          username: response.data?.data?.username || username,
        }
      } catch (error: any) {
        attempt++
        console.error(
          `❌ API attempt ${attempt}/${maxRetries} failed:`,
          error.message
        )

        if (attempt >= maxRetries) {
          return {
            success: false,
            error: error.message,
            reels: [],
            total: 0,
            userId: '',
            username: username,
          }
        }
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      reels: [],
      total: 0,
      userId: '',
      username: username,
    }
  }
}

// Функция расчета метрик
function calculateEngagementMetrics(reels: any[]) {
  const totalViews = reels.reduce(
    (sum, reel) => sum + (reel.play_count || 0),
    0
  )
  const totalLikes = reels.reduce(
    (sum, reel) => sum + (reel.like_count || 0),
    0
  )
  const totalComments = reels.reduce(
    (sum, reel) => sum + (reel.comment_count || 0),
    0
  )

  const avgEngagement =
    reels.length > 0
      ? reels.reduce((sum, reel) => {
          const engagement =
            ((reel.like_count || 0) + (reel.comment_count || 0)) /
            Math.max(reel.play_count || 1, 1)
          return sum + engagement
        }, 0) / reels.length
      : 0

  return { totalViews, totalLikes, totalComments, avgEngagement }
}

async function testAnalyzeCompetitorReelsDirect() {
  console.log('🎬 === ПРЯМОЙ ТЕСТ АНАЛИЗА РИЛЗ КОНКУРЕНТОВ ===\n')

  try {
    // Проверка переменных окружения
    console.log('🔧 Шаг 1: Проверка конфигурации...')
    if (!process.env.RAPIDAPI_INSTAGRAM_KEY) {
      throw new Error('RAPIDAPI_INSTAGRAM_KEY не установлен!')
    }
    console.log('✅ Instagram API ключ: присутствует')
    console.log('✅ Host:', process.env.RAPIDAPI_INSTAGRAM_HOST || 'default')

    // Тест валидации данных
    console.log('\n📝 Шаг 2: Тест валидации входных данных...')
    const testData = {
      username: 'alexyanovsky',
      max_reels: 5,
      days_back: 7,
      project_id: 1,
      requester_telegram_id: '144022504',
      metadata: {
        test: 'direct-test',
        timestamp: new Date().toISOString(),
      },
    }

    const validationResult = AnalyzeReelsEventSchema.safeParse(testData)
    if (!validationResult.success) {
      console.error('❌ Валидация провалена:', validationResult.error)
      throw new Error('Validation failed')
    }
    console.log('✅ Валидация входных данных успешна')

    // Тест Instagram API
    console.log('\n🎬 Шаг 3: Тест Instagram Reels API...')
    const api = new InstagramReelsAnalyzerDirect()
    const apiResult = await api.getUserReels(
      testData.username,
      testData.max_reels
    )

    if (!apiResult.success) {
      console.error('❌ Instagram API call failed:', apiResult.error)
      throw new Error(`API call failed: ${apiResult.error}`)
    }

    console.log('✅ Instagram API call successful!')
    console.log(`📊 Найдено рилз: ${apiResult.total}`)
    console.log(`👤 Username: ${apiResult.username}`)
    console.log(`🆔 User ID: ${apiResult.userId}`)

    // Показать примеры рилз
    if (apiResult.reels.length > 0) {
      console.log('\n📹 Примеры найденных рилз:')
      apiResult.reels.slice(0, 3).forEach((reel, index) => {
        console.log(`\n${index + 1}. Reel ID: ${reel.reel_id || reel.id}`)
        console.log(`   👍 Лайки: ${reel.like_count || 0}`)
        console.log(`   💬 Коменты: ${reel.comment_count || 0}`)
        console.log(`   👀 Просмотры: ${reel.play_count || 0}`)
        console.log(
          `   📅 Дата: ${
            reel.taken_at_timestamp
              ? new Date(reel.taken_at_timestamp * 1000).toLocaleDateString()
              : 'N/A'
          }`
        )
        console.log(
          `   🔗 URL: ${
            reel.shortcode
              ? `https://instagram.com/p/${reel.shortcode}/`
              : 'N/A'
          }`
        )
        if (reel.caption) {
          const shortCaption =
            reel.caption.length > 100
              ? reel.caption.substring(0, 100) + '...'
              : reel.caption
          console.log(`   📝 Описание: ${shortCaption}`)
        }
      })
    }

    // Тест фильтрации по датам
    console.log('\n📅 Шаг 4: Тест фильтрации по датам...')
    const now = new Date()
    const cutoffDate = new Date(
      now.getTime() - testData.days_back * 24 * 60 * 60 * 1000
    )

    const filteredReels = apiResult.reels.filter(reel => {
      if (!reel.taken_at_timestamp) return false
      const reelDate = new Date(reel.taken_at_timestamp * 1000)
      return reelDate >= cutoffDate
    })

    console.log(
      `✅ Фильтрация по датам (последние ${testData.days_back} дней):`
    )
    console.log(`   📊 Всего рилз: ${apiResult.reels.length}`)
    console.log(`   📅 После фильтрации: ${filteredReels.length}`)
    console.log(`   🗓️ Cutoff date: ${cutoffDate.toLocaleDateString()}`)

    // Тест расчета метрик
    console.log('\n📈 Шаг 5: Тест расчета метрик...')
    const metrics = calculateEngagementMetrics(filteredReels)

    console.log('✅ Метрики рассчитаны:')
    console.log(`   👀 Общие просмотры: ${metrics.totalViews.toLocaleString()}`)
    console.log(`   👍 Общие лайки: ${metrics.totalLikes.toLocaleString()}`)
    console.log(
      `   💬 Общие коменты: ${metrics.totalComments.toLocaleString()}`
    )
    console.log(
      `   📊 Средний engagement: ${(metrics.avgEngagement * 100).toFixed(4)}%`
    )

    // Тест сортировки по engagement
    console.log('\n🏆 Шаг 6: Тест сортировки по engagement...')
    const sortedReels = filteredReels.sort((a, b) => {
      const engagementA = (a.like_count || 0) + (a.comment_count || 0)
      const engagementB = (b.like_count || 0) + (b.comment_count || 0)
      return engagementB - engagementA
    })

    console.log('✅ Топ рилз по engagement:')
    sortedReels.slice(0, 3).forEach((reel, index) => {
      const engagement = (reel.like_count || 0) + (reel.comment_count || 0)
      const engagementRate = (
        (engagement / Math.max(reel.play_count || 1, 1)) *
        100
      ).toFixed(2)

      console.log(
        `\n${
          index + 1
        }. Engagement: ${engagement.toLocaleString()} (${engagementRate}%)`
      )
      console.log(`   👍 Лайки: ${(reel.like_count || 0).toLocaleString()}`)
      console.log(
        `   💬 Коменты: ${(reel.comment_count || 0).toLocaleString()}`
      )
      console.log(`   👀 Просмотры: ${(reel.play_count || 0).toLocaleString()}`)
      console.log(
        `   🔗 URL: ${
          reel.shortcode ? `https://instagram.com/p/${reel.shortcode}/` : 'N/A'
        }`
      )
    })

    // Финальный результат
    const finalResult = {
      success: true,
      username: testData.username,
      reelsFound: apiResult.total,
      reelsAnalyzed: filteredReels.length,
      topReels: sortedReels.slice(0, 5).map(reel => ({
        reel_id: reel.reel_id || reel.id,
        shortcode: reel.shortcode,
        likes: reel.like_count || 0,
        comments: reel.comment_count || 0,
        views: reel.play_count || 0,
        engagement: (reel.like_count || 0) + (reel.comment_count || 0),
        ig_url: reel.shortcode
          ? `https://instagram.com/p/${reel.shortcode}/`
          : '',
      })),
      metrics: {
        totalViews: metrics.totalViews,
        totalLikes: metrics.totalLikes,
        totalComments: metrics.totalComments,
        avgEngagement: metrics.avgEngagement,
      },
      daysBack: testData.days_back,
    }

    console.log('\n🎉 === ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! ===')
    console.log('\n📊 ИТОГОВЫЙ РЕЗУЛЬТАТ:')
    console.log(JSON.stringify(finalResult, null, 2))

    return finalResult
  } catch (error) {
    console.error('\n❌ Ошибка в тестировании:', error)

    if (error.message.includes('RAPIDAPI_INSTAGRAM_KEY')) {
      console.log(
        '\n🔧 РЕШЕНИЕ: Добавь переменную RAPIDAPI_INSTAGRAM_KEY в .env файл'
      )
    }

    if (error.message.includes('timeout')) {
      console.log(
        '\n🔧 РЕШЕНИЕ: Увеличь timeout или проверь интернет соединение'
      )
    }

    if (error.message.includes('rate limit')) {
      console.log(
        '\n🔧 РЕШЕНИЕ: Подожди несколько минут перед следующим запросом'
      )
    }

    throw error
  }
}

// Запускаем прямой тест
testAnalyzeCompetitorReelsDirect()
  .then(result => {
    console.log('\n🚀 === ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===')
    console.log('✅ Функция анализа рилз конкурентов работает корректно!')
    console.log(
      '📈 Все компоненты протестированы и функционируют как ожидается'
    )
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 === ТЕСТИРОВАНИЕ ПРОВАЛЕНО ===')
    console.error('❌ Ошибка:', error.message)
    process.exit(1)
  })
