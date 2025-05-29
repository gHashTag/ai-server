import { bflReliable } from './withCircuitBreaker'

export async function getTelegramIdFromFinetune(finetuneId: string) {
  return bflReliable.getTelegramIdFromFinetune(
    finetuneId,
    'get-telegram-id-from-finetune'
  )
}
