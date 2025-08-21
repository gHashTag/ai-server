import ffmpeg from 'fluent-ffmpeg'
import { Readable } from 'stream'

export const getVideoMetadata = (
  buffer: Buffer
): Promise<{
  width: number
  height: number
  aspectRatio: string
  duration: number
}> => {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer)

    ffmpeg(stream).ffprobe((err, data) => {
      if (err) return reject(err)

      const videoStream = data.streams.find(s => s.codec_type === 'video')
      if (!videoStream) return reject(new Error('No video stream found'))

      resolve({
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        aspectRatio: videoStream.display_aspect_ratio || 'N/A',
        duration: parseFloat(videoStream.duration || '0'),
      })
    })
  })
}
