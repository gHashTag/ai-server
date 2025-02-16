import { Request, Response } from 'express'
import { createOrFetchRoom } from '../services/roomService'

export const handleRoomRequest = async (req: Request, res: Response) => {
  try {
    const { name, type, telegram_id } = req.body

    if (!name || !type || !telegram_id) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const rooms = await createOrFetchRoom(name, type, telegram_id)

    res.status(200).json(rooms)
  } catch (error) {
    console.error('Error:', error)
    res.status(400).json({ error: error.message })
  }
}
