import { jest, describe, it, expect } from '@jest/globals'
import { transliterate } from '@/helpers/transliterate'

describe('transliterate helper - Detailed Tests', () => {
  describe('Individual character mapping', () => {
    describe('Uppercase letters', () => {
      it('should transliterate uppercase vowels correctly', () => {
        expect(transliterate('А')).toBe('A')
        expect(transliterate('Е')).toBe('E')
        expect(transliterate('И')).toBe('I')
        expect(transliterate('О')).toBe('O')
        expect(transliterate('У')).toBe('U')
        expect(transliterate('Ы')).toBe('I')
        expect(transliterate('Э')).toBe('E')
        expect(transliterate('Ю')).toBe('YU')
        expect(transliterate('Я')).toBe('YA')
      })

      it('should transliterate uppercase consonants correctly', () => {
        expect(transliterate('Б')).toBe('B')
        expect(transliterate('В')).toBe('V')
        expect(transliterate('Г')).toBe('G')
        expect(transliterate('Д')).toBe('D')
        expect(transliterate('Ж')).toBe('ZH')
        expect(transliterate('З')).toBe('Z')
        expect(transliterate('К')).toBe('K')
        expect(transliterate('Л')).toBe('L')
        expect(transliterate('М')).toBe('M')
        expect(transliterate('Н')).toBe('N')
      })

      it('should transliterate complex uppercase consonants', () => {
        expect(transliterate('П')).toBe('P')
        expect(transliterate('Р')).toBe('R')
        expect(transliterate('С')).toBe('S')
        expect(transliterate('Т')).toBe('T')
        expect(transliterate('Ф')).toBe('F')
        expect(transliterate('Х')).toBe('H')
        expect(transliterate('Ц')).toBe('TS')
        expect(transliterate('Ч')).toBe('CH')
        expect(transliterate('Ш')).toBe('SH')
        expect(transliterate('Щ')).toBe('SCH')
      })

      it('should transliterate special uppercase characters', () => {
        expect(transliterate('Ё')).toBe('YO')
        expect(transliterate('Й')).toBe('I')
        expect(transliterate('Ъ')).toBe('Y')
        expect(transliterate('Ь')).toBe('Y')
      })
    })

    describe('Lowercase letters', () => {
      it('should transliterate lowercase vowels correctly', () => {
        expect(transliterate('а')).toBe('a')
        expect(transliterate('е')).toBe('e')
        expect(transliterate('и')).toBe('i')
        expect(transliterate('о')).toBe('o')
        expect(transliterate('у')).toBe('u')
        expect(transliterate('ы')).toBe('i')
        expect(transliterate('э')).toBe('e')
        expect(transliterate('ю')).toBe('yu')
        expect(transliterate('я')).toBe('ya')
      })

      it('should transliterate lowercase consonants correctly', () => {
        expect(transliterate('б')).toBe('b')
        expect(transliterate('в')).toBe('v')
        expect(transliterate('г')).toBe('g')
        expect(transliterate('д')).toBe('d')
        expect(transliterate('ж')).toBe('zh')
        expect(transliterate('з')).toBe('z')
        expect(transliterate('к')).toBe('k')
        expect(transliterate('л')).toBe('l')
        expect(transliterate('м')).toBe('m')
        expect(transliterate('н')).toBe('n')
      })

      it('should transliterate complex lowercase consonants', () => {
        expect(transliterate('п')).toBe('p')
        expect(transliterate('р')).toBe('r')
        expect(transliterate('с')).toBe('s')
        expect(transliterate('т')).toBe('t')
        expect(transliterate('ф')).toBe('f')
        expect(transliterate('х')).toBe('h')
        expect(transliterate('ц')).toBe('ts')
        expect(transliterate('ч')).toBe('ch')
        expect(transliterate('ш')).toBe('sh')
        expect(transliterate('щ')).toBe('sch')
      })

      it('should transliterate special lowercase characters', () => {
        expect(transliterate('ё')).toBe('yo')
        expect(transliterate('й')).toBe('i')
        expect(transliterate('ъ')).toBe('y')
        expect(transliterate('ь')).toBe('y')
      })
    })
  })

  describe('Word transliteration', () => {
    it('should transliterate common Russian words', () => {
      expect(transliterate('Привет')).toBe('Privet')
      expect(transliterate('Россия')).toBe('Rossiya')
      expect(transliterate('Москва')).toBe('Moskva')
      expect(transliterate('Санкт-Петербург')).toBe('Sankt-Peterburg')
      expect(transliterate('Ёлка')).toBe('YOlka')
    })

    it('should transliterate names correctly', () => {
      expect(transliterate('Иван')).toBe('Ivan')
      expect(transliterate('Мария')).toBe('Mariya')
      expect(transliterate('Александр')).toBe('Aleksandr')
      expect(transliterate('Екатерина')).toBe('Ekaterina')
      expect(transliterate('Дмитрий')).toBe('Dmitrii')
    })

    it('should transliterate complex words with multiple character mappings', () => {
      expect(transliterate('Щедрость')).toBe('SCHedrosty')
      expect(transliterate('Съёмка')).toBe('Syyomka')
      expect(transliterate('Подъезд')).toBe('Podyezd')
      expect(transliterate('Объявление')).toBe('Obyyavlenie')
    })

    it('should handle mixed case correctly', () => {
      expect(transliterate('ПрИвЕт')).toBe('PrIvEt')
      expect(transliterate('МоСкВа')).toBe('MoSkVa')
      expect(transliterate('РоСсИя')).toBe('RoSsIya')
    })
  })

  describe('Mixed content', () => {
    it('should preserve Latin characters', () => {
      expect(transliterate('Hello мир')).toBe('Hello mir')
      expect(transliterate('Привет world')).toBe('Privet world')
      expect(transliterate('Test тест')).toBe('Test test')
      expect(transliterate('API запрос')).toBe('API zapros')
    })

    it('should preserve numbers', () => {
      expect(transliterate('Дом 123')).toBe('Dom 123')
      expect(transliterate('2023 год')).toBe('2023 god')
      expect(transliterate('Версия 1.0')).toBe('Versiya 1.0')
    })

    it('should preserve special symbols', () => {
      expect(transliterate('Привет!')).toBe('Privet!')
      expect(transliterate('Что?')).toBe('CHto?')
      expect(transliterate('Email: test@mail.ru')).toBe('Email: test@mail.ru')
      expect(transliterate('Цена: $100')).toBe('TSena: $100')
    })

    it('should preserve punctuation', () => {
      expect(transliterate('Привет, мир!')).toBe('Privet, mir!')
      expect(transliterate('Это - тест.')).toBe('Eto - test.')
      expect(transliterate('Вопрос: кто?')).toBe('Vopros: kto?')
      expect(transliterate('(Скобки)')).toBe('(Skobki)')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(transliterate('')).toBe('')
    })

    it('should handle single characters', () => {
      expect(transliterate('а')).toBe('a')
      expect(transliterate('Я')).toBe('YA')
      expect(transliterate('x')).toBe('x')
      expect(transliterate('5')).toBe('5')
    })

    it('should handle strings with only spaces', () => {
      expect(transliterate(' ')).toBe(' ')
      expect(transliterate('   ')).toBe('   ')
      expect(transliterate('\t')).toBe('\t')
      expect(transliterate('\n')).toBe('\n')
    })

    it('should handle strings with only punctuation', () => {
      expect(transliterate('!@#$%^&*()')).toBe('!@#$%^&*()')
      expect(transliterate('.,;:')).toBe('.,;:')
      expect(transliterate('[]{}()')).toBe('[]{}()')
    })

    it('should handle very long strings', () => {
      const longRussian = 'а'.repeat(1000)
      const expectedLatin = 'a'.repeat(1000)
      expect(transliterate(longRussian)).toBe(expectedLatin)
    })

    it('should handle strings with repeated characters', () => {
      expect(transliterate('ааа')).toBe('aaa')
      expect(transliterate('ЩЩЩ')).toBe('SCHSCHSCH')
      expect(transliterate('йййй')).toBe('iiii')
    })
  })

  describe('Unicode and special characters', () => {
    it('should handle whitespace characters', () => {
      expect(transliterate('Привет\nмир')).toBe('Privet\nmir')
      expect(transliterate('Тест\tтест')).toBe('Test\ttest')
      expect(transliterate('Строка\r\nстрока')).toBe('Stroka\r\nstroka')
    })

    it('should handle emoji (left unchanged)', () => {
      expect(transliterate('Привет 🚀')).toBe('Privet 🚀')
      expect(transliterate('Тест 😊 эмодзи')).toBe('Test 😊 emodzi')
      expect(transliterate('🇷🇺 Россия')).toBe('🇷🇺 Rossiya')
    })

    it('should handle other Cyrillic characters (non-Russian)', () => {
      // These should remain unchanged as they're not in the mapping
      expect(transliterate('Ї')).toBe('Ї') // Ukrainian
      expect(transliterate('Ґ')).toBe('Ґ') // Ukrainian
      expect(transliterate('Ћ')).toBe('Ћ') // Serbian
    })
  })

  describe('Real-world examples', () => {
    it('should transliterate file names', () => {
      expect(transliterate('документ.pdf')).toBe('dokument.pdf')
      expect(transliterate('фотография.jpg')).toBe('fotografiya.jpg')
      expect(transliterate('презентация.pptx')).toBe('prezentatsiya.pptx')
    })

    it('should transliterate URLs and paths', () => {
      expect(transliterate('сайт.рф')).toBe('sait.rf')
      expect(transliterate('/папка/файл')).toBe('/papka/fail')
      expect(transliterate('https://пример.рф/страница')).toBe('https://primer.rf/stranitsa')
    })

    it('should transliterate user input', () => {
      expect(transliterate('Поиск по сайту')).toBe('Poisk po saitu')
      expect(transliterate('Введите ваше имя')).toBe('Vvedite vashe imya')
      expect(transliterate('Сохранить изменения?')).toBe('Sohranity izmeneniya?')
    })

    it('should transliterate technical terms', () => {
      expect(transliterate('Переменная')).toBe('Peremennaya')
      expect(transliterate('Функция')).toBe('Funktsiya')
      expect(transliterate('Объект')).toBe('Obyekt')
      expect(transliterate('Массив')).toBe('Massiv')
    })
  })

  describe('Performance and consistency', () => {
    it('should be consistent with repeated calls', () => {
      const input = 'Тестовая строка'
      const expected = 'Testovaya stroka'
      
      expect(transliterate(input)).toBe(expected)
      expect(transliterate(input)).toBe(expected)
      expect(transliterate(input)).toBe(expected)
    })

    it('should handle concatenated results correctly', () => {
      const part1 = transliterate('Первая')
      const part2 = transliterate('часть')
      const full = transliterate('Первая часть')
      
      expect(part1 + ' ' + part2).toBe(full)
      expect(part1).toBe('Pervaya')
      expect(part2).toBe('chasty')
      expect(full).toBe('Pervaya chasty')
    })
  })
})