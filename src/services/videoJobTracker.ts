/**
 * 🎬 Video Job Tracker
 * Отслеживание статуса заданий генерации видео
 */

import { logger } from '@/utils/logger'

export interface VideoJob {
  id: string
  type: 'text-to-video' | 'image-to-video' | 'veo3-video'
  telegram_id: string
  bot_name: string
  prompt: string
  video_model?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: Date
  started_at?: Date
  completed_at?: Date
  error_message?: string
  progress?: {
    stage: string
    percentage?: number
    estimated_remaining_minutes?: number
  }
  result?: {
    video_url: string
    processing_time_ms: number
    file_size_mb?: number
    duration_seconds?: number
  }
  provider?: 'replicate' | 'google-veo3' | 'kie-ai' | 'vertex-ai'
  provider_job_id?: string
}

// In-memory хранилище заданий видео (в продакшене заменить на Redis/PostgreSQL)
const videoJobs = new Map<string, VideoJob>()

/**
 * Создание нового задания видео
 */
export function createVideoJob(
  jobId: string,
  type: VideoJob['type'],
  telegram_id: string,
  bot_name: string,
  prompt: string,
  video_model?: string
): VideoJob {
  const job: VideoJob = {
    id: jobId,
    type,
    telegram_id,
    bot_name,
    prompt,
    video_model,
    status: 'pending',
    created_at: new Date(),
    progress: {
      stage: 'Initializing',
      percentage: 0,
    },
  }

  videoJobs.set(jobId, job)
  logger.info(`📹 Created video job: ${jobId}`, {
    type,
    telegram_id,
    video_model,
  })

  return job
}

/**
 * Обновление статуса задания
 */
export function updateVideoJobStatus(
  jobId: string,
  status: VideoJob['status'],
  updates: Partial<VideoJob> = {}
): VideoJob | null {
  const job = videoJobs.get(jobId)
  if (!job) {
    logger.warn(`📹 Video job not found: ${jobId}`)
    return null
  }

  // Обновляем статус
  job.status = status

  // Устанавливаем временные метки
  if (status === 'processing' && !job.started_at) {
    job.started_at = new Date()
  }
  if ((status === 'completed' || status === 'failed') && !job.completed_at) {
    job.completed_at = new Date()
  }

  // Применяем дополнительные обновления
  Object.assign(job, updates)

  videoJobs.set(jobId, job)
  logger.info(`📹 Updated video job: ${jobId}`, { status, updates })

  return job
}

/**
 * Получение статуса задания
 */
export function getVideoJobStatus(jobId: string): VideoJob | null {
  return videoJobs.get(jobId) || null
}

/**
 * Получение всех заданий пользователя
 */
export function getUserVideoJobs(telegram_id: string): VideoJob[] {
  const userJobs: VideoJob[] = []

  for (const job of videoJobs.values()) {
    if (job.telegram_id === telegram_id) {
      userJobs.push(job)
    }
  }

  // Сортируем по времени создания (новые сначала)
  return userJobs.sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  )
}

/**
 * Установка результата для задания
 */
export function setVideoJobResult(
  jobId: string,
  result: VideoJob['result']
): VideoJob | null {
  return updateVideoJobStatus(jobId, 'completed', { result })
}

/**
 * Установка ошибки для задания
 */
export function setVideoJobError(
  jobId: string,
  error_message: string
): VideoJob | null {
  return updateVideoJobStatus(jobId, 'failed', { error_message })
}

/**
 * Обновление прогресса задания
 */
export function updateVideoJobProgress(
  jobId: string,
  progress: VideoJob['progress']
): VideoJob | null {
  const job = videoJobs.get(jobId)
  if (!job) {
    return null
  }

  job.progress = { ...job.progress, ...progress }
  videoJobs.set(jobId, job)

  return job
}

/**
 * Установка провайдера для задания
 */
export function setVideoJobProvider(
  jobId: string,
  provider: VideoJob['provider'],
  provider_job_id?: string
): VideoJob | null {
  return updateVideoJobStatus(jobId, 'processing', {
    provider,
    provider_job_id,
    progress: {
      stage: `Processing with ${provider}`,
      percentage: 10,
    },
  })
}

/**
 * Получение статистики заданий
 */
export function getVideoJobsStats() {
  const stats = {
    total: videoJobs.size,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    by_type: {} as Record<string, number>,
    by_provider: {} as Record<string, number>,
  }

  for (const job of videoJobs.values()) {
    // Статусы
    stats[job.status]++

    // По типам
    stats.by_type[job.type] = (stats.by_type[job.type] || 0) + 1

    // По провайдерам
    if (job.provider) {
      stats.by_provider[job.provider] =
        (stats.by_provider[job.provider] || 0) + 1
    }
  }

  return stats
}

/**
 * Очистка старых заданий (старше 24 часов)
 */
export function cleanupOldVideoJobs(): number {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let deletedCount = 0

  for (const [jobId, job] of videoJobs.entries()) {
    if (
      job.created_at < oneDayAgo &&
      (job.status === 'completed' || job.status === 'failed')
    ) {
      videoJobs.delete(jobId)
      deletedCount++
    }
  }

  if (deletedCount > 0) {
    logger.info(`🧹 Cleaned up ${deletedCount} old video jobs`)
  }

  return deletedCount
}

// Автоматическая очистка каждые 6 часов
setInterval(cleanupOldVideoJobs, 6 * 60 * 60 * 1000)
