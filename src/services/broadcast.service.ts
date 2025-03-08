import { supabase } from '../core/supabase'
import { getBotByName } from '../core/bot'

export const broadcastService = {
  sendToAllUsers: async (imageUrl: string, text: string) => {
    const { data: users, error } = await supabase
      .from('users')
      .select('telegram_id, bot_name')
    // const users = [{ telegram_id: 144022504, bot_name: 'neuro_blogger_bot' }]
    if (error) {
      throw new Error('Error fetching users: ' + error.message)
    }

    if (users) {
      for (const user of users) {
        if (user.telegram_id && user.bot_name) {
          try {
            const { bot } = getBotByName(user.bot_name)
            await bot.telegram.sendPhoto(
              user.telegram_id.toString(),
              imageUrl,
              {
                caption: text,
                parse_mode: 'Markdown',
              }
            )
            console.log(`Message sent to user: ${user.telegram_id} 📸`)
          } catch (err) {
            if (err.response) {
              const errorCode = err.response.error_code
              if (errorCode === 403 || errorCode === 400) {
                console.error(
                  `Removing user ${user.telegram_id} due to error: ${err.response.description}`
                )
                await supabase
                  .from('users')
                  .delete()
                  .eq('telegram_id', user.telegram_id)
              } else {
                console.error(
                  `Failed to send message to user: ${user.telegram_id}`,
                  err
                )
              }
            } else {
              console.error(
                `Unexpected error for user: ${user.telegram_id}`,
                err
              )
            }
          }
        }
      }
    }
  },
}
// curl -X POST http://localhost:3000/broadcast \
//   -H "Content-Type: application/json" \
//   -d '{
//     "imageUrl": "https://yuukfqcsdhkyxegfwlcb.supabase.co/storage/v1/object/public/landingpage/avatars/neuro_blogger_bot/flux_pro.jpeg",
//     "text": "Добрый день!\n\nМы рады сообщить, что наш бот стал еще лучше! 🎉\n\n✨ Запущена нейро-модель с улучшенными настройками!\nТеперь бот предлагает еще более впечатляющие результаты и выдает меньше брака. Попробуйте переобучить модель и вы точно заметите разницу!\n\n🌟 Что можно сделать сейчас?\n* Начните пользоваться ботом и оцените новую модель.\n* Обучите Цифровое тело на своих фотографиях.\n* Попробуйте функцию нейрофото и создайте уникальные изображения, которые вас удивят!\n\nНе упустите возможность первыми оценить все нововведения. Мы уверены, что вам понравится!\n\nСпасибо, что вы с нами. Ждем вашего feedback!"
//   }'
