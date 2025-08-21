import { supabase } from '.'

export const getSelectIzbushkaId = async (selectIzbushka: string) => {
  try {
    const { data: dataIzbushka, error: selectIzbushkaError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', selectIzbushka)

    const izbushka = dataIzbushka && dataIzbushka[0]

    if (izbushka) {
      return { dataIzbushka, izbushka, selectIzbushkaError: null }
    } else {
      return { dataIzbushka: [], izbushka: null, selectIzbushkaError }
    }
  } catch (error) {
    console.error('Error getting select izbushka id:', error)
    return { dataIzbushka: [], izbushka: null, selectIzbushkaError: error }
  }
}
