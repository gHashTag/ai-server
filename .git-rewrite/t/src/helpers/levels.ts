interface Level {
  title_ru: string
  title_en: string
}

export const levels: Record<number, Level> = {
  0: {
    title_ru: '💫 Оформить подписку',
    title_en: '💫 Subscribe',
  },
  // digital_avatar_body
  1: {
    title_ru: '🤖 Цифровое тело',
    title_en: '🤖 Digital Body',
  },
  // neuro_photo
  2: {
    title_ru: '📸 Нейрофото',
    title_en: '📸 NeuroPhoto',
  },
  // image_to_prompt
  3: {
    title_ru: '🔍 Промпт из фото',
    title_en: '🔍 Prompt from Photo',
  },
  // avatar
  4: {
    title_ru: '🧠 Мозг аватара',
    title_en: '🧠 Avatar Brain',
  },
  // chat_with_avatar
  5: {
    title_ru: '💭 Чат с аватаром',
    title_en: '💭 Chat with avatar',
  },
  // select_model
  6: {
    title_ru: '🤖 Выбор модели ИИ',
    title_en: '🤖 Choose AI Model',
  },
  // voice
  7: {
    title_ru: '🎤 Голос аватара',
    title_en: '🎤 Avatar Voice',
  },
  // text_to_speech
  8: {
    title_ru: '🎙️ Текст в голос',
    title_en: '🎙️ Text to Voice',
  },
  // image_to_video
  9: {
    title_ru: '🎥 Фото в видео',
    title_en: '🎥 Photo to Video',
  },
  // text_to_video
  10: {
    title_ru: '🎥 Видео из текста',
    title_en: '🎥 Text to Video',
  },
  // text_to_image
  11: {
    title_ru: '🖼️ Текст в фото',
    title_en: '🖼️ Text to Image',
  },
  // lip_sync
  // 12: {
  //   title_ru: '🎤 Синхронизация губ',
  //   title_en: '🎤 Lip Sync',
  // },
  // 13: {
  //   title_ru: '🎥 Видео в URL',
  //   title_en: '🎥 Video in URL',
  // },
  // step0
  // paymentScene
  100: {
    title_ru: '💎 Пополнить баланс',
    title_en: '💎 Top up balance',
  },
  // balanceCommand
  101: {
    title_ru: '🤑 Баланс',
    title_en: '🤑 Balance',
  },
  // inviteCommand
  102: {
    title_ru: '👥 Пригласить друга',
    title_en: '👥 Invite a friend',
  },
  // helpCommand
  103: {
    title_ru: '❓ Помощь',
    title_en: '❓ Help',
  },
  104: {
    title_ru: '🏠 Главное меню',
    title_en: '🏠 Main menu',
  },
}
