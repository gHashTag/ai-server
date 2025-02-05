import { GameStep } from '@/interfaces'
import {
  getLastStep,
  getPlan,
  getUserByTelegramId,
  Plan,
  createHistory,
  setLeelaStart,
} from '@/core/supabase'

const directionMap: { [key: string]: { ru: string; en: string } } = {
  'stop 🛑': { ru: 'Стоп 🛑', en: 'Stop 🛑' },
  'стоп 🛑': { ru: 'Стоп 🛑', en: 'Stop 🛑' },
  'arrow 🏹': { ru: 'Стрела 🏹', en: 'Arrow 🏹' },
  'стрела 🏹': { ru: 'Стрела 🏹', en: 'Arrow 🏹' },
  'snake 🐍': { ru: 'Змея 🐍', en: 'Snake 🐍' },
  'змея 🐍': { ru: 'Змея 🐍', en: 'Snake 🐍' },
  'win 🕉': { ru: 'Победа 🕉', en: 'Win 🕉' },
  'победа 🕉': { ru: 'Победа 🕉', en: 'Win 🕉' },
  'step 🚶🏼': { ru: 'Шаг 🚶🏼', en: 'Step 🚶🏼' },
  'шаг 🚶🏼': { ru: 'Шаг 🚶🏼', en: 'Step 🚶🏼' },
}

export class GameService {
  public async processGameStep(
    roll: number,
    telegram_id: string
  ): Promise<{ gameStep: GameStep; plan: Plan; direction: string }> {
    const TOTAL = 72
    const WIN_LOKA = 68
    const MAX_ROLL = 6

    const userInfo = await getUserByTelegramId(telegram_id)
    console.log('userInfo', userInfo)
    const language_code = userInfo.language_code
    const result = await getLastStep(telegram_id, language_code)

    let newLoka = result.loka + roll
    let direction: GameStep['direction']
    let new_consecutive_sixes: number
    let new_position_before_three_sixes = result.position_before_three_sixes
    let new_is_finished = result.is_finished

    if (roll == MAX_ROLL) {
      new_consecutive_sixes = result.consecutive_sixes + 1
      if (result.consecutive_sixes == 2) {
        newLoka = result.position_before_three_sixes
        new_consecutive_sixes = 0
        direction = 'snake 🐍'
      } else {
        new_position_before_three_sixes = result.loka
      }
    } else {
      new_consecutive_sixes = 0
    }

    if (new_is_finished) {
      if (roll === MAX_ROLL) {
        newLoka = 6
        direction = 'step 🚶🏼'
        new_is_finished = false
      } else {
        direction = 'stop 🛑'
      }
    } else if (newLoka === WIN_LOKA) {
      direction = 'win 🕉'
      new_is_finished = true
    } else if (newLoka == 12) {
      newLoka = 8
      direction = 'snake 🐍'
    } else if (newLoka == 16) {
      newLoka = 4
      direction = 'snake 🐍'
    } else if (newLoka == 24) {
      newLoka = 7
      direction = 'snake 🐍'
    } else if (newLoka == 29) {
      newLoka = 6
      direction = 'snake 🐍'
    } else if (newLoka == 44) {
      newLoka = 9
      direction = 'snake 🐍'
    } else if (newLoka == 52) {
      newLoka = 35
      direction = 'snake 🐍'
    } else if (newLoka == 55) {
      newLoka = 3
      direction = 'snake 🐍'
    } else if (newLoka == 61) {
      newLoka = 13
      direction = 'snake 🐍'
    } else if (newLoka == 63) {
      newLoka = 2
      direction = 'snake 🐍'
    } else if (newLoka == 72) {
      newLoka = 51
      direction = 'snake 🐍'
    } else if (newLoka == 10) {
      newLoka = 23
      direction = 'arrow 🏹'
    } else if (newLoka == 17) {
      newLoka = 69
      direction = 'arrow 🏹'
    } else if (newLoka == 20) {
      newLoka = 32
      direction = 'arrow 🏹'
    } else if (newLoka == 22) {
      newLoka = 60
      direction = 'arrow 🏹'
    } else if (newLoka == 27) {
      newLoka = 41
      direction = 'arrow 🏹'
    } else if (newLoka == 28) {
      newLoka = 50
      direction = 'arrow 🏹'
    } else if (newLoka == 37) {
      newLoka = 66
      direction = 'arrow 🏹'
    } else if (newLoka == 45) {
      newLoka = 67
      direction = 'arrow 🏹'
    } else if (newLoka == 46) {
      newLoka = 62
      direction = 'arrow 🏹'
    } else if (newLoka == 54) {
      newLoka = 68
      direction = 'arrow 🏹'
    } else if (newLoka > TOTAL) {
      direction = 'stop 🛑'
      newLoka = result.loka
    } else {
      direction = 'step 🚶🏼'
    }

    const gameStep = {
      loka: newLoka,
      previous_loka: result.loka,
      direction,
      consecutive_sixes: new_consecutive_sixes,
      position_before_three_sixes: new_position_before_three_sixes,
      is_finished: new_is_finished,
    }

    const newPlan = await getPlan(newLoka, userInfo.language_code)

    await createHistory({
      roll,
      report: '',
      telegram_id,
      username: userInfo.username,
      language_code: userInfo.language_code,
      is_finished: new_is_finished,
      ...gameStep,
    })

    if (newLoka === WIN_LOKA) {
      await setLeelaStart(telegram_id, false)
    }
    return {
      gameStep,
      plan: newPlan,
      direction: directionMap[direction][language_code],
    }
  }
}
