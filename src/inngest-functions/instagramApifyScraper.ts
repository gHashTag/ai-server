/**
 * Instagram Apify Scraper - Парсинг рилз через Apify
 * Интеграция логики из instagram-scraper-bot
 */

import { inngest } from '@/core/inngest/clients'
import { ApifyClient } from 'apify-client'
import { Pool } from 'pg'
import { z } from 'zod'
import { instagramScrapingRates } from '@/price/helpers/modelsCost'
import { updateUserBalance } from '@/core/supabase/updateUserBalance'

// Схема валидации входных данных
const ApifyScraperEventSchema = z.object({
  username_or_hashtag: z.string().min(1),
  project_id: z.number().positive(),
  source_type: z.enum(['competitor', 'hashtag']),
  max_reels: z.number().min(1).max(500).default(50),
  min_views: z.number().min(0).optional(),
  max_age_days: z.number().min(1).max(365).optional(),
  requester_telegram_id: z.string().optional(),
  bot_name: z.string().optional(),
})

// Интерфейс для Apify рилса
interface ApifyReelItem {
  id?: string
  shortCode?: string
  caption?: string
  hashtags?: string[]
  url?: string
  videoUrl?: string
  displayUrl?: string
  likesCount?: number
  commentsCount?: number
  videoViewCount?: number
  videoPlayCount?: number
  timestamp?: string
  ownerUsername?: string
  ownerId?: string
  videoDuration?: number
  isVideo?: boolean
  productType?: string
  type?: string
  musicInfo?: {
    artist_name?: string | null
    song_name?: string | null
  }
}

// База данных
const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[APIFY-SCRAPER] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[APIFY-SCRAPER] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[APIFY-SCRAPER] ${msg}`, data || ''),
}

/**
 * Функция парсинга Instagram через Apify
 */
export const instagramApifyScraper = inngest.createFunction(
  {
    id: 'instagram-apify-scraper',
    name: '🤖 Instagram Apify Scraper',
    concurrency: 2,
  },
  { event: 'instagram/apify-scrape' },
  async ({ event, step, runId }) => {
    log.info('🚀 Instagram Apify Scraper запущен', {
      runId,
      eventData: event.data,
    })

    // Step 1: Валидация входных данных
    const validatedData = await step.run('validate-input', async () => {
      const result = ApifyScraperEventSchema.safeParse(event.data)

      if (!result.success) {
        throw new Error(`Invalid input: ${result.error.message}`)
      }

      if (!process.env.APIFY_TOKEN) {
        throw new Error('APIFY_TOKEN не настроен в переменных окружения')
      }

      log.info('✅ Входные данные валидированы')
      return result.data
    })

    // Step 2: Инициализация Apify клиента
    const apifyClient = await step.run('init-apify-client', async () => {
      // Отладочная информация
      log.info('🔍 Отладка ApifyClient импорта:', {
        ApifyClient: typeof ApifyClient,
        ApifyClientPrototype: ApifyClient?.prototype?.constructor?.name,
        ApifyClientKeys: ApifyClient
          ? Object.getOwnPropertyNames(ApifyClient.prototype)
          : 'undefined',
      })

      const client = new ApifyClient({
        token: process.env.APIFY_TOKEN!,
      })

      // Отладочная информация о созданном клиенте
      log.info('🔍 Отладка созданного клиента:', {
        clientType: typeof client,
        clientConstructor: client?.constructor?.name,
        hasActorMethod: typeof client?.actor,
        clientKeys: client
          ? Object.getOwnPropertyNames(Object.getPrototypeOf(client))
          : 'undefined',
      })

      log.info('✅ Apify клиент инициализирован')
      return client
    })

    // Step 3: Подготовка параметров для Apify
    const apifyInput = await step.run('prepare-apify-input', async () => {
      const { username_or_hashtag, source_type, max_reels } = validatedData

      let input: any

      if (source_type === 'hashtag') {
        // Для хештегов
        const hashtag = username_or_hashtag.replace('#', '').trim()
        input = {
          search: `#${hashtag}`,
          searchType: 'hashtag',
          searchLimit: 250, // Максимум для поиска
          resultsType: 'posts',
          resultsLimit: max_reels,
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
        }
        log.info(`📌 Параметры для хештега #${hashtag}`, input)
      } else {
        // Для пользователей - ИСПРАВЛЕННЫЙ ФОРМАТ
        const username = username_or_hashtag.replace('@', '').trim()
        input = {
          directUrls: [`https://www.instagram.com/${username}/`], // Правильный формат!
          resultsType: 'posts',
          resultsLimit: Math.max(max_reels * 5, 20), // Парсим больше постов чтобы найти видео
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
        }
        log.info(`👤 Параметры для пользователя @${username}`, input)
      }

      return input
    })

    // Step 4: Запуск Apify актора
    const apifyResults = await step.run('run-apify-actor', async () => {
      log.info('🎬 Запуск Apify актора instagram-scraper...')

      try {
        // Создаем новый клиент в каждом step для избежания проблем с сериализацией
        const freshClient = new ApifyClient({
          token: process.env.APIFY_TOKEN!,
        })

        // Отладочная информация о свежесозданном клиенте
        log.info('🔍 Проверка свежего клиента в step:', {
          clientType: typeof freshClient,
          hasActorMethod: typeof freshClient?.actor,
          actorType: typeof freshClient.actor,
        })

        // Запускаем актор через свежий клиент
        const run = await freshClient
          .actor('apify/instagram-scraper')
          .call(apifyInput)

        log.info('✅ Apify актор завершён', {
          runId: run.id,
          status: run.status,
        })

        // Получаем результаты через тот же свежий клиент
        const { items } = await freshClient
          .dataset(run.defaultDatasetId)
          .listItems()

        log.info(`📦 Получено ${items.length} элементов от Apify`)

        // Полный лог первого элемента для отладки
        if (items.length > 0) {
          log.info(
            '🔍 Полные данные первого элемента:',
            JSON.stringify(items[0], null, 2)
          )
        }

        return items
      } catch (error: any) {
        log.error('❌ Ошибка Apify', error)
        throw new Error(`Apify error: ${error.message}`)
      }
    })

    // Step 5: Обработка и фильтрация результатов
    const processedReels = await step.run('process-reels', async () => {
      const { source_type, min_views, max_age_days } = validatedData

      let allPosts: ApifyReelItem[] = []

      // Извлекаем посты в зависимости от типа источника
      if (source_type === 'hashtag') {
        log.info('📝 Извлекаем посты из хештегов...')
        apifyResults.forEach((item: any) => {
          if (item.topPosts && Array.isArray(item.topPosts)) {
            allPosts.push(...item.topPosts)
          }
          if (item.latestPosts && Array.isArray(item.latestPosts)) {
            allPosts.push(...item.latestPosts)
          }
        })
      } else {
        allPosts = apifyResults as ApifyReelItem[]
      }

      log.info(`📊 Всего постов для обработки: ${allPosts.length}`)

      // Фильтрация по дате
      let maxAgeDate: Date | null = null
      if (max_age_days) {
        maxAgeDate = new Date()
        maxAgeDate.setDate(maxAgeDate.getDate() - max_age_days)
        log.info(`📅 Фильтр по дате: не старше ${max_age_days} дней`)
      }

      // Отладочная информация о постах
      log.info('🔍 Анализируем посты:', {
        posts_sample: allPosts.slice(0, 3).map(post => ({
          type: post.type,
          productType: post.productType,
          isVideo: post.isVideo,
          videoUrl: !!post.videoUrl,
          shortCode: post.shortCode,
        })),
      })

      // Фильтрация рилсов
      const filteredReels = allPosts.filter(item => {
        // РАСШИРЕННАЯ ЛОГИКА - парсим ВСЕ что может быть видео
        const isReel =
          item.type === 'Video' || // Прямое видео
          item.productType === 'clips' || // Рилсы
          item.isVideo === true || // Флаг видео
          !!item.videoUrl || // Есть URL видео
          !!item.videoPlayUrl || // Альтернативный URL видео
          (item.videoViewCount && item.videoViewCount > 0) || // Есть просмотры
          (item.videoPlayCount && item.videoPlayCount > 0) || // Альтернативные просмотры
          item.type === 'GraphVideo' || // Другой тип видео
          item.typename === 'GraphVideo' || // Через typename
          (item.displayUrl && item.displayUrl.includes('video')) || // URL содержит video
          item.isVideo === 'true' || // Строковое значение
          (item.media_type && item.media_type === 2) // Instagram media_type для видео

        if (!isReel) {
          log.info('⏭️ Пропущен не-рилс:', {
            type: item.type,
            productType: item.productType,
            isVideo: item.isVideo,
            shortCode: item.shortCode,
          })
          return false
        }

        // Проверка даты
        if (maxAgeDate && item.timestamp) {
          const pubDate = new Date(item.timestamp)
          if (pubDate < maxAgeDate) return false
        }

        // Проверка просмотров
        if (min_views !== undefined) {
          const views = item.videoViewCount || item.videoPlayCount || 0
          if (views < min_views) {
            log.info(
              `⏭️ Пропущен рилс с ${views} просмотрами (мин: ${min_views})`
            )
            return false
          }
        }

        return true
      })

      log.info(`✅ После фильтрации: ${filteredReels.length} рилсов`)

      // Форматируем для сохранения
      return filteredReels.map(reel => ({
        reel_id: reel.id || reel.shortCode || '',
        url: reel.url || `https://instagram.com/p/${reel.shortCode}/`,
        video_url: reel.videoUrl,
        thumbnail_url: reel.displayUrl,
        caption: reel.caption || '',
        hashtags: reel.hashtags || [],
        owner_username: reel.ownerUsername || '',
        owner_id: reel.ownerId || '',
        views_count: reel.videoViewCount || reel.videoPlayCount || 0,
        likes_count: reel.likesCount || 0,
        comments_count: reel.commentsCount || 0,
        duration: reel.videoDuration || 0,
        published_at: reel.timestamp ? new Date(reel.timestamp) : new Date(),
        music_artist: reel.musicInfo?.artist_name || null,
        music_title: reel.musicInfo?.song_name || null,
      }))
    })

    // Step 6: Сохранение в базу данных
    const saveResult = await step.run('save-to-database', async () => {
      const client = await dbPool.connect()
      let saved = 0
      let duplicates = 0

      try {
        // Создаём таблицу если её нет
        await client.query(`
          CREATE TABLE IF NOT EXISTS instagram_apify_reels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reel_id VARCHAR(255) UNIQUE,
            url TEXT NOT NULL,
            video_url TEXT,
            thumbnail_url TEXT,
            caption TEXT,
            hashtags JSONB,
            owner_username VARCHAR(255),
            owner_id VARCHAR(255),
            views_count INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            duration FLOAT,
            published_at TIMESTAMP,
            music_artist VARCHAR(255),
            music_title VARCHAR(255),
            project_id INTEGER,
            scraped_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `)

        // Сохраняем рилсы
        for (const reel of processedReels) {
          try {
            await client.query(
              `INSERT INTO instagram_apify_reels 
               (reel_id, url, video_url, thumbnail_url, caption, hashtags,
                owner_username, owner_id, views_count, likes_count, 
                comments_count, duration, published_at, music_artist, 
                music_title, project_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               ON CONFLICT (reel_id) DO NOTHING`,
              [
                reel.reel_id,
                reel.url,
                reel.video_url,
                reel.thumbnail_url,
                reel.caption,
                JSON.stringify(reel.hashtags),
                reel.owner_username,
                reel.owner_id,
                reel.views_count,
                reel.likes_count,
                reel.comments_count,
                reel.duration,
                reel.published_at,
                reel.music_artist,
                reel.music_title,
                validatedData.project_id,
              ]
            )
            saved++
          } catch (error: any) {
            if (error.code === '23505') {
              duplicates++
            } else {
              log.error(`Ошибка сохранения рилса: ${error.message}`)
            }
          }
        }

        log.info(`💾 Сохранено в БД: ${saved} новых, ${duplicates} дубликатов`)
        return { saved, duplicates, total: saved + duplicates }
      } finally {
        client.release()
      }
    })

    // Step 7: Монетизация - списание за рилсы
    if (
      processedReels.length > 0 &&
      validatedData.requester_telegram_id !== 'auto-system'
    ) {
      await step.run('charge-for-reels', async () => {
        try {
          const totalCostStars =
            processedReels.length * instagramScrapingRates.costPerReelInStars

          log.info('💰 Списание за рилсы:', {
            reelsCount: processedReels.length,
            costPerReel: instagramScrapingRates.costPerReelInStars,
            totalCost: totalCostStars,
            userId: validatedData.requester_telegram_id,
          })

          await updateUserBalance({
            telegram_id: validatedData.requester_telegram_id,
            bot_name: validatedData.bot_name || 'neuro_blogger_bot',
            amount: totalCostStars, // Положительное значение
            operation_type: 'money_out_com', // Списание со счета
            description: `Instagram парсинг: ${processedReels.length} рилсов @${validatedData.username_or_hashtag}`,
          })

          log.info('✅ Списание за рилсы выполнено успешно')
        } catch (error: any) {
          log.error('❌ Ошибка списания за рилсы:', error.message)
          // Не прерываем выполнение, но логируем
        }
      })
    }

    // Step 8: (Старый триггер удален - теперь используется прямой триггер в конце)

    // Step 9: Отправка уведомления в Telegram (если указан И это НЕ auto-system)
    if (
      validatedData.requester_telegram_id &&
      validatedData.bot_name &&
      validatedData.requester_telegram_id !== 'auto-system'
    ) {
      await step.run('send-telegram-notification', async () => {
        try {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName(validatedData.bot_name!)

          // Проверяем bot перед отправкой
          if (!bot || !bot.telegram) {
            log.error(
              '❌ Bot instance is invalid in instagramApifyScraper (telegram notification)'
            )
            return // Пропускаем уведомление, но не ломаем основной процесс
          }

          const totalCostStars =
            processedReels.length * instagramScrapingRates.costPerReelInStars
          const totalCostRubles =
            processedReels.length * instagramScrapingRates.costPerReelInRubles

          const message = `
🎬 Парсинг Instagram через Apify завершён!

📌 Источник: ${validatedData.username_or_hashtag}
🎯 Тип: ${validatedData.source_type === 'hashtag' ? 'Хештег' : 'Пользователь'}
📊 Найдено рилсов: ${processedReels.length}
💾 Сохранено новых: ${saveResult.saved}
🔄 Пропущено дубликатов: ${saveResult.duplicates}

${
  processedReels.length > 0 &&
  validatedData.requester_telegram_id !== 'auto-system'
    ? `
💰 Стоимость: ${totalCostStars.toFixed(2)} ⭐ (${totalCostRubles.toFixed(2)} ₽)
💳 Списано с баланса
`
    : ''
}

${
  processedReels.length > 0
    ? `
🏆 Топ рилс по просмотрам:
${processedReels
  .sort((a, b) => b.views_count - a.views_count)
  .slice(0, 3)
  .map(
    (r, i) =>
      `${i + 1}. @${
        r.owner_username
      }: ${r.views_count.toLocaleString()} просмотров`
  )
  .join('\n')}
`
    : ''
}
✅ Данные сохранены в базу данных`

          await bot.telegram.sendMessage(
            validatedData.requester_telegram_id,
            message
          )

          log.info('✅ Уведомление отправлено в Telegram')
        } catch (error) {
          log.error('❌ Ошибка отправки в Telegram:', error)
        }
      })
    }

    // Финальный результат
    const result = {
      success: true,
      source: validatedData.username_or_hashtag,
      sourceType: validatedData.source_type,
      projectId: validatedData.project_id,
      reelsFound: processedReels.length,
      reelsSaved: saveResult.saved,
      duplicatesSkipped: saveResult.duplicates,
      topReels: processedReels
        .sort((a, b) => b.views_count - a.views_count)
        .slice(0, 5)
        .map(r => ({
          username: r.owner_username,
          views: r.views_count,
          likes: r.likes_count,
          url: r.url,
        })),
      scrapedAt: new Date(),
    }

    log.info('🎉 Instagram Apify Scraper завершён успешно', result)

    // КРИТИЧЕСКИЙ ТРИГГЕР ДОСТАВКИ - ПОСЛЕ ВСЕХ ОПЕРАЦИЙ, НО ПЕРЕД RETURN!
    if (
      processedReels.length > 0 &&
      validatedData.requester_telegram_id === 'auto-system'
    ) {
      try {
        log.info('🚨 КРИТИЧЕСКИЙ ТРИГГЕР: Запускаем доставку после парсинга!', {
          reelsCount: processedReels.length,
          competitor: validatedData.username_or_hashtag,
          projectId: validatedData.project_id,
        })

        // Запускаем доставку БЕЗ step.run - напрямую!
        const deliveryResult = await inngest.send({
          name: 'competitor/delivery-reels',
          data: {
            competitor_username: validatedData.username_or_hashtag,
            project_id: validatedData.project_id,
            triggered_by: 'auto-parser',
          },
        })

        log.info('🎉 УСПЕХ: Доставка запущена!', {
          eventId: deliveryResult.ids[0],
          competitor: validatedData.username_or_hashtag,
        })
      } catch (error: any) {
        log.error('💀 КРИТИЧЕСКАЯ ОШИБКА ТРИГГЕРА:', {
          error: error.message,
          stack: error.stack,
          competitor: validatedData.username_or_hashtag,
        })
      }
    }

    // Уведомление админа о завершении работы
    if (process.env.ADMIN_CHAT_ID && validatedData.bot_name) {
      try {
        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName(validatedData.bot_name)

        // Проверяем bot перед отправкой
        if (!bot || !bot.telegram) {
          log.error(
            '❌ Bot instance is invalid in instagramApifyScraper (admin notification)'
          )
          return // Пропускаем уведомление админу, но не ломаем основной процесс
        }

        const adminMessage = `
🔧 Instagram Apify Scraper завершён

📊 Результат:
• Источник: @${validatedData.username_or_hashtag}
• Найдено рилсов: ${processedReels.length}
• Сохранено: ${saveResult.saved}
• Пользователь: ${validatedData.requester_telegram_id}
• Project ID: ${validatedData.project_id}

${
  processedReels.length > 0
    ? '✅ Монетизация: списание выполнено'
    : '💰 Монетизация: списание не требуется'
}
${
  processedReels.length > 0 &&
  validatedData.requester_telegram_id === 'auto-system'
    ? '📬 Доставка автоматически запущена'
    : ''
}
🎯 Функция выполнена полностью
        `

        await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage)
        log.info('📤 Уведомление админу отправлено')
      } catch (error: any) {
        log.error('❌ Ошибка уведомления админу:', error.message)
      }
    }

    return result
  }
)

// Helper функция для запуска парсинга
export async function triggerApifyInstagramScraping(data: any) {
  const result = await inngest.send({
    name: 'instagram/apify-scrape',
    data,
  })

  return {
    eventId: result.ids[0],
  }
}
