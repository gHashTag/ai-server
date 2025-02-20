import { Request, Response, NextFunction } from 'express'
import { broadcastService } from '../services'

export const broadcastController = {
  sendBroadcast: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageUrl, text } = req.body
      if (!imageUrl || !text) {
        return res
          .status(400)
          .json({ message: 'Image URL and text are required' })
      }

      await broadcastService.sendToAllUsers(imageUrl, text)
      res.status(200).json({ message: 'Broadcast sent successfully' })
    } catch (error) {
      next(error)
    }
  },
}
