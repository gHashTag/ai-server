#!/usr/bin/env node
/**
 * 🔥 Instagram Scraper V2 - Quick Reference для Telegram Bot
 *
 * EVENT NAME: 'instagram/scraper-v2'
 * RESULT: Конкуренты + Рилсы + HTML отчёт + Excel + ZIP архив
 */

const { Inngest } = require('inngest')

// ========================================
// 🎯 ОСНОВНОЕ СОБЫТИЕ
// ========================================

async function sendInstagramAnalysisEvent(userData) {
  const inngest = new Inngest({ id: 'telegram-bot-client' })

  const result = await inngest.send({
    name: 'instagram/scraper-v2', // ← НАЗВАНИЕ СОБЫТИЯ
    data: {
      // ✅ ОБЯЗАТЕЛЬНЫЕ
      username_or_id: userData.targetUsername, // Instagram username (без @)
      project_id: userData.projectId, // Номер проекта пользователя

      // ⚙️ ОПЦИОНАЛЬНЫЕ
      max_users: userData.maxCompetitors || 10, // Количество конкурентов (1-100)
      max_reels_per_user: userData.maxReels || 5, // Рилсов на конкурента (1-200)
      scrape_reels: userData.includeReels || false, // Парсить рилсы true/false
      requester_telegram_id: userData.telegramId, // Telegram ID пользователя
    },
  })

  return result.ids[0] // Event ID для отслеживания
}

// ========================================
// 🎬 ПРИМЕРЫ ЗАПРОСОВ
// ========================================

// 📱 Базовый (только конкуренты)
const basicRequest = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'target_account',
    project_id: 123,
  },
}

// 🔥 Полный анализ (конкуренты + рилсы)
const fullRequest = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov',
    project_id: 37,
    max_users: 10,
    max_reels_per_user: 5,
    scrape_reels: true,
    requester_telegram_id: '144022504',
  },
}

// ⚡ Быстрый тест
const testRequest = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'test_account',
    project_id: 1,
    max_users: 3,
    scrape_reels: false,
  },
}

// ========================================
// 📋 РЕЗУЛЬТАТ ФУНКЦИИ
// ========================================

const expectedResult = {
  success: true,
  targetUser: 'vyacheslav_nekludov',
  projectId: 37,
  usersScraped: 50,
  usersSaved: 10,
  reelsScraped: 25,

  // 🆕 НОВОЕ: Архив с отчётами
  reports: {
    generated: true,
    htmlReport:
      '/path/to/instagram_analysis_vyacheslav_nekludov_1234567890.html',
    excelReport: '/path/to/instagram_data_vyacheslav_nekludov_1234567890.xlsx',
    archivePath:
      '/path/to/instagram_competitors_vyacheslav_nekludov_1234567890.zip',
    archiveFileName: 'instagram_competitors_vyacheslav_nekludov_1234567890.zip',
    error: null,
  },
}

// ========================================
// 📦 ОТПРАВКА АРХИВА В TELEGRAM
// ========================================

async function sendArchiveToTelegramUser(ctx, reportInfo, targetUsername) {
  if (!reportInfo || !reportInfo.generated) {
    return ctx.reply('❌ Отчёт не создан')
  }

  // Отправляем ZIP архив
  await ctx.replyWithDocument(
    {
      source: reportInfo.archivePath, // Путь к ZIP файлу
      filename: reportInfo.archiveFileName, // Имя файла
    },
    {
      caption:
        `📦 Анализ конкурентов для @${targetUsername}\n\n` +
        `📊 В архиве:\n` +
        `• HTML отчёт (откройте в браузере)\n` +
        `• Excel файл (данные для анализа)\n` +
        `• README инструкция\n\n` +
        `💡 Откройте HTML для красивого просмотра!`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Новый анализ', callback_data: 'new_search' }],
        ],
      },
    }
  )
}

// ========================================
// ✅ ГОТОВЫЕ ФУНКЦИИ ДЛЯ КОПИРОВАНИЯ
// ========================================

// Для обработчика команды в боте
async function handleInstagramCommand(ctx, userData) {
  const eventId = await sendInstagramAnalysisEvent({
    targetUsername: userData.username,
    projectId: userData.projectId,
    maxCompetitors: userData.count || 10,
    includeReels: userData.reels || false,
    telegramId: ctx.from.id.toString(),
  })

  await ctx.reply(
    `🔄 Запущен анализ конкурентов для @${userData.username}\n` +
      `📋 Event ID: ${eventId}\n` +
      `⏳ Ожидайте результаты через 3-5 минут`
  )

  return eventId
}

// Проверка результатов через таймер
setTimeout(() => {
  // Проверить результат и отправить архив
  checkAndSendReport(ctx, eventId, userData)
}, 5 * 60 * 1000) // 5 минут

module.exports = {
  sendInstagramAnalysisEvent,
  sendArchiveToTelegramUser,
  handleInstagramCommand,
}
