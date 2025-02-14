import { Request, Response } from 'express'
import { PaymentService } from '@/services/payment.service'
import { PASSWORD2, MERCHANT_LOGIN, RESULT_URL2 } from '@/config'
import md5 from 'md5'

export class PaymentSuccessController {
  private paymentService = new PaymentService()
  private password2 = PASSWORD2
  private merchantLogin = MERCHANT_LOGIN
  private resultUrl2 = RESULT_URL2

  public paymentSuccess = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { body } = req // Получаем тело запроса
      console.log('Received body:', body)

      // Если тело запроса уже является объектом, используйте его напрямую
      const notification = typeof body === 'string' ? JSON.parse(body) : body
      console.log('Parsed notification:', notification)

      // Извлекаем данные из уведомления
      const { header, data } = notification
      const { shop, opKey, invId, paymentMethod, incSum, state } = data

      // Проверяем подпись
      const calculatedSignature = md5(
        `${this.merchantLogin}:${opKey}:${invId}:${encodeURIComponent(
          this.resultUrl2
        )}:${this.password2}`
      ).toUpperCase()

      // Проверяем, что подпись из уведомления совпадает с рассчитанной
      if (calculatedSignature !== header.signature) {
        throw new Error('Invalid signature')
      } else {
        console.log('Signature is valid')
        await this.paymentService.processPayment(incSum, invId) // Используем incSum вместо OutSum
      }

      // Ответ Robokassa
      res.status(200).send(`OK${invId}`)
    } catch (error) {
      console.error('Ошибка обработки успешного платежа:', error)
      res.status(500).send('Internal Server Error')
    }
  }
}

export default new PaymentSuccessController()
