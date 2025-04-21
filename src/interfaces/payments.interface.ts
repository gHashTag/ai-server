export interface BalanceOperationResult {
  newBalance: number
  paymentAmount: number
  success: boolean
  error?: string
}
export interface Payment {
  id: string
  amount: number
  date: string
}

export type PaymentService =
  | 'NeuroPhoto'
  | 'Text to speech'
  | 'Image to video'
  | 'Text to image'
  | 'Training'
  | 'Refund'
  | 'System'
  | 'Telegram'
  | 'Robokassa'
  | 'Unknown'
