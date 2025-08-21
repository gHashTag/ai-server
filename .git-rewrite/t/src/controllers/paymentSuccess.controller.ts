import { Request, Response } from 'express'
import { PaymentService } from '@/services/payment.service'
import { logger } from '@/utils/logger'
// import { PASSWORD2, MERCHANT_LOGIN, RESULT_URL2 } from '@/config'
// import md5 from 'md5'

export class PaymentSuccessController {
  private paymentService = new PaymentService()
  // private password2 = PASSWORD2
  // private merchantLogin = MERCHANT_LOGIN
  // private resultUrl2 = RESULT_URL2

  public paymentSuccess = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { body } = req // Получаем тело запроса
      logger.info('Received body:', body)

      const { inv_id, IncSum } = body

      const roundedIncSum = Number(IncSum)
      console.log('💰 processPayment: округленная сумма', roundedIncSum)
      await this.paymentService.processPayment(
        roundedIncSum.toString(),
        inv_id,
        res
      )
    } catch (error) {
      logger.error('Ошибка обработки успешного платежа:', error)
      res.status(500).send('Internal Server Error')
    }
  }
}

export default new PaymentSuccessController()
