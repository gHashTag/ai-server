import { Request, Response, NextFunction } from 'express'
import { SECRET_API_KEY } from '../config'

export const checkSecretKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secretKey = req.headers['x-secret-key']

  if (secretKey !== SECRET_API_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid secret key' })
  }

  next()
}
