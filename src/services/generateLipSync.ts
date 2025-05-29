import { WEBHOOK_URL } from '@/config'
import { setSyncLabsVideo } from '@/core/supabase'
import { syncLabsReliable } from '@/core/synclabs/withCircuitBreaker'

export type LipSyncStatus =
  | 'CANCELED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING'
  | 'REJECTED'

export interface LipSyncResponse {
  id: string
  createdAt: string
  status: LipSyncStatus
  model: string
  input: Array<{
    url: string
    type: string
  }>
  webhookUrl: string
  options: {
    output_format: string
  }
  outputUrl: string | null
  outputDuration: number | null
  error: string | null
}

export interface LipSyncResult extends Partial<LipSyncResponse> {
  message?: string
}

export async function generateLipSync(
  telegram_id: string,
  video: string,
  audio: string,
  is_ru: boolean
): Promise<LipSyncResult> {
  try {
    const result = await syncLabsReliable.generateLipSync(
      {
        video,
        audio,
        webhookUrl: WEBHOOK_URL,
      },
      'generate-lipsync'
    )

    if (result?.id) {
      await setSyncLabsVideo(telegram_id, result.id, is_ru)
      return result
    } else {
      return { message: 'No video ID found in response' }
    }
  } catch (error) {
    console.error('LipSync generation error:', error)
    return { message: 'Error occurred while generating lip sync' }
  }
}
