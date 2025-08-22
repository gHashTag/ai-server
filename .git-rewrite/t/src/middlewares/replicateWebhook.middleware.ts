import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { buffer } from 'micro'

export const validateReplicateSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers['x-replicate-signature']
  const rawBody = await buffer(req)

  const expectedSignature = crypto
    .createHmac('sha256', process.env.REPLICATE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    console.log('🚨 Invalid signature! Received:', signature)
    return res.status(401).send('Invalid signature')
  }

  req.body = JSON.parse(rawBody.toString())
  next()
}
