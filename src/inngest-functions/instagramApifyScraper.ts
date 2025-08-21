/**
 * Instagram Apify Scraper - Парсинг рилз через Apify
 * Интеграция логики из instagram-scraper-bot
 */

import { inngest } from '@/core/inngest/clients'
import { ApifyClient } from 'apify-client'
import { supabase } from '@/supabase/client'
import { z } from 'zod'

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

// Supabase клиент уже импортирован

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
        ApifyClientKeys: ApifyClient ? Object.getOwnPropertyNames(ApifyClient.prototype) : 'undefined'
      })
      
      const client = new ApifyClient({
        token: process.env.APIFY_TOKEN!,
      })
      
      // Отладочная информация о созданном клиенте
      log.info('🔍 Отладка созданного клиента:', {
        clientType: typeof client,
        clientConstructor: client?.constructor?.name,
        hasActorMethod: typeof client?.actor,
        clientKeys: client ? Object.getOwnPropertyNames(Object.getPrototypeOf(client)) : 'undefined'
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
        // Для пользователей
        const username = username_or_hashtag.replace('@', '').trim()
        input = {
          username: [username],
          resultsLimit: max_reels,
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
          actorType: typeof freshClient.actor
        })
        
        // Запускаем актор через свежий клиент
        const run = await freshClient.actor('apify/instagram-scraper').call(apifyInput)
        
        log.info('✅ Apify актор завершён', {
          runId: run.id,
          status: run.status,
        })
        
        // Получаем результаты через тот же свежий клиент
        const { items } = await freshClient
          .dataset(run.defaultDatasetId)
          .listItems()
        
        log.info(`📦 Получено ${items.length} элементов от Apify`)
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
      
      // Фильтрация рилсов
      const filteredReels = allPosts.filter((item) => {
        // Проверяем, что это видео/рилс
        const isReel = 
          item.type === 'Video' ||
          item.productType === 'clips' ||
          item.isVideo === true
        
        if (!isReel) return false
        
        // Проверка даты
        if (maxAgeDate && item.timestamp) {
          const pubDate = new Date(item.timestamp)
          if (pubDate < maxAgeDate) return false
        }
        
        // Проверка просмотров
        if (min_views !== undefined) {
          const views = item.videoViewCount || item.videoPlayCount || 0
          if (views < min_views) {
            log.info(`⏭️ Пропущен рилс с ${views} просмотрами (мин: ${min_views})`)
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

    // Step 6: Сохранение в базу данных Supabase
    const saveResult = await step.run('save-to-database', async () => {
      let saved = 0
      let duplicates = 0
      
      try {
        // Преобразуем данные для Supabase
        const reelsForInsert = processedReels.map(reel => ({
          reel_id: reel.reel_id,
          url: reel.url,
          video_url: reel.video_url,
          thumbnail_url: reel.thumbnail_url,
          caption: reel.caption,
          hashtags: reel.hashtags,
          owner_username: reel.owner_username,
          owner_id: reel.owner_id,
          views_count: reel.views_count,
          likes_count: reel.likes_count,
          comments_count: reel.comments_count,
          duration: reel.duration,
          published_at: reel.published_at,
          music_artist: reel.music_artist,
          music_title: reel.music_title,
          project_id: validatedData.project_id,
          scraped_at: new Date().toISOString()
        }))
        
        // Сохраняем рилсы через upsert (вставка или обновление)
        for (const reel of reelsForInsert) {
          const { error } = await supabase
            .from('instagram_apify_reels')
            .upsert(reel, {
              onConflict: 'reel_id',
              ignoreDuplicates: false
            })
          
          if (error) {
            if (error.code === '23505' || error.message.includes('duplicate')) {
              duplicates++
            } else {
              log.error(`Ошибка сохранения рилса: ${error.message}`)
            }
          } else {
            saved++
          }
        }
        
        log.info(`💾 Сохранено в Supabase: ${saved} новых, ${duplicates} дубликатов`)
        return { saved, duplicates, total: saved + duplicates }
      } catch (error) {
        log.error('❌ Ошибка сохранения в Supabase:', error)
        return { saved: 0, duplicates: 0, total: 0 }
      }
    })

    // Step 7: Отправка уведомления в Telegram (если указан)
    if (validatedData.requester_telegram_id && validatedData.bot_name) {
      await step.run('send-telegram-notification', async () => {
        try {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName(validatedData.bot_name!)
          
          const message = `
🎬 Парсинг Instagram через Apify завершён!

📌 Источник: ${validatedData.username_or_hashtag}
🎯 Тип: ${validatedData.source_type === 'hashtag' ? 'Хештег' : 'Пользователь'}
📊 Найдено рилсов: ${processedReels.length}
💾 Сохранено новых: ${saveResult.saved}
🔄 Пропущено дубликатов: ${saveResult.duplicates}

${processedReels.length > 0 ? `
🏆 Топ рилс по просмотрам:
${processedReels
  .sort((a, b) => b.views_count - a.views_count)
  .slice(0, 3)
  .map((r, i) => `${i + 1}. @${r.owner_username}: ${r.views_count.toLocaleString()} просмотров`)
  .join('\n')}
` : ''}
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