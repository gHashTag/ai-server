import { Request, Response } from 'express'
import { VideoService } from '@/services/videoService'

export class VideoController {
  private videoService: VideoService

  constructor() {
    this.videoService = new VideoService()
  }

  public uploadVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoUrl, telegram_id, fileName } = req.body
      if (!videoUrl || !telegram_id || !fileName) {
        res
          .status(400)
          .json({ message: 'videoUrl, telegram_id, and fileName are required' })
        return
      }

      const videoLocalPath = await this.videoService.processVideo(
        videoUrl,
        telegram_id,
        fileName
      )
      res
        .status(200)
        .json({ message: 'Video successfully saved', videoLocalPath })
    } catch (error) {
      console.error('Error uploading video:', error)
      res.status(500).json({ message: 'Error uploading video' })
    }
  }
}
