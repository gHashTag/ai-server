import axios, { isAxiosError } from 'axios'
import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB - максимальный размер для Telegram

export async function downloadFile(url: string): Promise<Buffer> {
  return circuitBreakers.fileDownload.execute(async () => {
    return retryExternalAPI(async () => {
      try {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
          throw new Error(`Invalid URL received: ${url}`)
        }

        logger.debug('📥 Downloading file', {
          url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
          operation: 'download-file',
        })

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 60000,
          maxRedirects: 5,
          validateStatus: status => status === 200,
        })

        if (!response.data) {
          throw new Error('Empty response data')
        }

        const buffer = Buffer.from(response.data)

        if (buffer.length > MAX_FILE_SIZE) {
          throw new Error(
            `File size (${buffer.length} bytes) exceeds Telegram limit of ${MAX_FILE_SIZE} bytes`
          )
        }

        logger.debug('✅ File downloaded successfully', {
          url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
          size: buffer.length,
          operation: 'download-file',
        })

        return buffer
      } catch (error) {
        logger.error('❌ Error downloading file', {
          url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
          error: error instanceof Error ? error.message : String(error),
          operation: 'download-file',
        })

        if (isAxiosError(error)) {
          logger.error('📊 Axios error details', {
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: error.config?.headers,
            },
          })
        }

        throw new Error(
          `Failed to download file: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }, 'download-file')
  })
}
