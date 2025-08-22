// ... existing code ...
import ffmpeg from 'fluent-ffmpeg'
import { PassThrough } from 'stream'
import { Readable } from 'stream'

// 🆕 Функция для оптимизации видео под Telegram
export const optimizeForTelegram = async (
  buffer: Buffer,
  aspectRatio: string
): Promise<Buffer> => {
  console.log('📲 Optimizing video for Telegram...')

  return new Promise((resolve, reject) => {
    const outputBuffer: Buffer[] = []
    const inputStream = Readable.from(buffer)
    const outputStream = new PassThrough()

    const command = ffmpeg()
      .input(inputStream)
      .inputFormat('mp4')
      .outputFormat('mp4')
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2',
      ])
      .aspect(aspectRatio)
      .on('start', cmd => console.log('🚀 FFmpeg command:', cmd))
      .on('error', err => {
        console.error('🔥 FFmpeg error:', err.message)
        reject(err)
      })
      .on('end', () => {
        console.log('✅ Optimization completed')
        resolve(Buffer.concat(outputBuffer))
      })

    outputStream.on('data', chunk => outputBuffer.push(chunk))
    command.pipe(outputStream, { end: false })
  })
}
