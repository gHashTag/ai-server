import { supabase } from '../core/supabase'
import { getBotByName } from '../core/bot'

export const broadcastService = {
  sendToAllUsers: async (imageUrl: string, text: string) => {
    const { data: users, error } = await supabase
      .from('users')
      .select('telegram_id, bot_name')

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
