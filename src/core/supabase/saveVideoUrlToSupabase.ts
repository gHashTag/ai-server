import { supabase } from '@/core/supabase'

export async function saveVideoUrlToSupabase(
  telegramId: number,
  videoUrl: string,
  videoPath: string,
  type: string
) {
  const { error } = await supabase.from('assets').insert({
    type: type,
    trigger_word: 'video',
    telegram_id: telegramId.toString(),
    storage_path: videoPath,
    public_url: videoUrl,
    text: 'Generated video',
  })

  if (error) {
    console.error('Ошибка при сохранении URL видео в Supabase:', error)
  } else {
    console.log('URL видео успешно сохранен в Supabase')
  }
}
