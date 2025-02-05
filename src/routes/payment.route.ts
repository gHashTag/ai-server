import { Router } from 'express'
import { PaymentSuccessController } from '@controllers/paymentSuccess.controller'

export class PaymentRoute {
  public path = '/payment-success'
  public router: Router = Router()
  public paymentSuccessController = new PaymentSuccessController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.get(this.path, this.paymentSuccessController.paymentSuccess)
  }
}
