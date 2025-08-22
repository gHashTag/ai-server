const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.MONITORING_BOT_TOKEN || process.env.BOT_TOKEN_1;
// const GROUP_CHAT_ID = '-1002250147975';
const ADMIN_ID = '144022504'; // Отправляем админу для теста

async function testTelegram() {
  try {
    const bot = new Telegraf(BOT_TOKEN);
    
    const message = `✅ <b>Тестовое сообщение мониторинга</b>\n\n` +
      `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
      `📊 Система мониторинга логов успешно подключена!\n` +
      `🚀 Inngest функции готовы к работе\n\n` +
      `<b>Функции мониторинга:</b>\n` +
      `• 📊 Log Monitor - анализ логов каждые 24 часа\n` +
      `• 🚨 Critical Error Monitor - мгновенные уведомления об ошибках\n` +
      `• 💚 Health Check - проверка сервисов каждые 30 минут\n\n` +
      `#тест #мониторинг #ai_server`;

    await bot.telegram.sendMessage(ADMIN_ID, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    
    console.log('✅ Сообщение успешно отправлено в Telegram!');
    console.log('📱 Проверьте группу: https://t.me/c/2250147975/1');
    
  } catch (error) {
    console.error('❌ Ошибка отправки в Telegram:', error);
  }
}

testTelegram();
