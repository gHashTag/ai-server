import { supabase } from '.'

export type Plan = {
  short_desc: string
  name: string
}

export async function getPlan(loka: number, isRu: boolean): Promise<Plan> {
  console.log('getPlan', loka, isRu)
  try {
    // Получить строку данных из таблицы по loka
    const language = isRu ? 'ru' : 'en'
    const name = isRu ? 'name_ru' : 'name'
    const { data, error }: any = await supabase
      .from('plans')
      .select(`short_desc_${language}, ${name}`)
      .eq('loka', loka)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return {
      short_desc: data[`short_desc_${language}`],
      name: data[name],
    }
  } catch (error) {
    console.log(error, 'error')
  }
}
