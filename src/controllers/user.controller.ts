import { Request, Response } from 'express'
import { createUserService } from '@/services'

export class UserController {
  public createUserHandler = async (req: Request, res: Response) => {
    try {
      const result = await createUserService(req.body)
      res.status(200).json(result)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  }
}
