import { Request, Response } from 'express'
import { PaymentService } from '@/services/payment.service'
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
      console.log('Received body:', body)

      const { inv_id, IncSum } = body

      // Округляем IncSum до целого числа
      const roundedIncSum = Math.round(parseFloat(IncSum))
      console.log('Rounded IncSum:', roundedIncSum)

      console.log('Signature is valid')
      await this.paymentService.processPayment(roundedIncSum, inv_id)

      // Ответ Robokassa
      res.status(200).send(`OK${inv_id}`)
    } catch (error) {
      console.error('Ошибка обработки успешного платежа:', error)
      res.status(500).send('Internal Server Error')
    }
  }
}

export default new PaymentSuccessController()
