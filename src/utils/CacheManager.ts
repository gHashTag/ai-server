import { logger } from '@/utils/logger'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { promisify } from 'util'
import { gzip, gunzip } from 'zlib'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

// === ENUMS ===

export enum CacheStrategy {
  LRU = 'LRU',
  LFU = 'LFU',
  ADAPTIVE = 'ADAPTIVE',
}

export enum CacheLevel {
  MEMORY = 'MEMORY',
  FILE = 'FILE',
  AUTO = 'AUTO',
}

// === ZOD SCHEMAS ===

export const cacheConfigSchema = z.object({
  defaultTTL: z.number().min(50).default(300000), // 50ms минимум для тестов
  maxMemorySize: z
    .number()
    .min(50)
    .default(100 * 1024 * 1024), // 50 bytes минимум для тестов
  compressionThreshold: z.number().min(100).default(10240), // 10KB
  enableFileCache: z.boolean().default(false),
  fileCacheDir: z.string().default('/tmp/cache'),
  enableStats: z.boolean().default(true),
  strategy: z.nativeEnum(CacheStrategy).default(CacheStrategy.LRU),
  cleanupInterval: z.number().min(10000).default(60000), // 1 минута
})

export const cacheOptionsSchema = z.object({
  ttl: z.number().min(50).optional(), // 50ms минимум для тестов
  level: z.nativeEnum(CacheLevel).default(CacheLevel.MEMORY),
  compress: z.boolean().optional(),
  dependencies: z.array(z.string()).optional(),
  autoExtend: z.boolean().default(false),
  popularityThreshold: z.number().min(1).default(5),
  prefetchKeys: z.array(z.string()).optional(),
  prefetchFn: z.function().optional(),
})

export const cacheStatsSchema = z.object({
  totalKeys: z.number(),
  memoryKeys: z.number(),
  fileKeys: z.number(),
  hits: z.number(),
  misses: z.number(),
  hitRate: z.number(),
  memoryUsage: z.number(),
  compressionRatio: z.number(),
  lastCleanup: z.string(),
  averageAccessTime: z.number(),
})

// === TYPES ===

export type CacheConfig = z.infer<typeof cacheConfigSchema>
export type CacheOptions = z.infer<typeof cacheOptionsSchema>
export type CacheStats = z.infer<typeof cacheStatsSchema>

interface CacheEntry {
  value: any
  expiresAt: number
  accessCount: number
  lastAccessed: number
  size: number
  originalSize: number // Оригинальный размер до сжатия
  compressed: boolean
  level: CacheLevel
  dependencies?: string[]
}

interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  memoryUsage: number
  totalAccessTime: number
  compressionSaved: number
  lastCleanup: number
}

// === MAIN CLASS ===

export class CacheManager {
  private config: CacheConfig
  private memoryCache = new Map<string, CacheEntry>()
  private dependencyMap = new Map<string, Set<string>>() // parent -> children
  private metrics: CacheMetrics
  private cleanupTimer?: NodeJS.Timeout
  private stopped = false

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = cacheConfigSchema.parse(config)
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      memoryUsage: 0,
      totalAccessTime: 0,
      compressionSaved: 0,
      lastCleanup: Date.now(),
    }

    this.startCleanupTimer()
    this.ensureFileCacheDir()

    logger.info('🗄️ CacheManager initialized', {
      config: this.config,
      strategy: this.config.strategy,
    })
  }

  // === PUBLIC API ===

  /**
   * Сохранить значение в кэш
   */
  async set(
    key: string,
    value: any,
    options: Partial<CacheOptions> = {}
  ): Promise<void> {
    try {
      const validatedOptions = cacheOptionsSchema.parse(options)
      const startTime = Date.now()

      logger.debug('🗄️ Cache SET', {
        key,
        level: validatedOptions.level,
        ttl: validatedOptions.ttl,
        hasDependencies: !!validatedOptions.dependencies?.length,
      })

      // Сериализация и сжатие
      const serialized = await this.serializeValue(value, validatedOptions)
      if (!serialized) return

      const entry: CacheEntry = {
        value: serialized.data,
        expiresAt:
          Date.now() + (validatedOptions.ttl || this.config.defaultTTL),
        accessCount: 0,
        lastAccessed: Date.now(),
        size: serialized.size,
        originalSize: serialized.originalSize,
        compressed: serialized.compressed,
        level: validatedOptions.level,
        dependencies: validatedOptions.dependencies,
      }

      // Определяем уровень кэширования
      const level = this.determineCacheLevel(entry, validatedOptions)

      // Сохраняем в соответствующий уровень
      if (level === CacheLevel.MEMORY || level === CacheLevel.AUTO) {
        await this.setMemoryCache(key, entry)
      }

      if (
        level === CacheLevel.FILE ||
        (level === CacheLevel.AUTO &&
          entry.size > this.config.compressionThreshold)
      ) {
        await this.setFileCache(key, entry)
      }

      // Обновляем зависимости
      if (validatedOptions.dependencies) {
        this.updateDependencies(key, validatedOptions.dependencies)
      }

      // Prefetching
      if (validatedOptions.prefetchKeys && validatedOptions.prefetchFn) {
        this.prefetchRelatedData(
          validatedOptions.prefetchKeys,
          validatedOptions.prefetchFn
        )
      }

      this.metrics.sets++
      this.metrics.totalAccessTime += Date.now() - startTime

      logger.debug('✅ Cache SET completed', {
        key,
        size: entry.size,
        compressed: entry.compressed,
        level,
        duration: Date.now() - startTime,
      })
    } catch (error) {
      logger.error('❌ Cache SET error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Получить значение из кэша
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now()

    try {
      // Проверяем memory cache
      let entry = this.memoryCache.get(key)

      // Если не найдено в памяти, проверяем файловый кэш
      if (!entry && this.config.enableFileCache) {
        entry = await this.getFileCache(key)
        if (entry) {
          // Перемещаем в memory cache для быстрого доступа
          this.memoryCache.set(key, entry)
        }
      }

      if (!entry) {
        this.metrics.misses++
        return null
      }

      // Проверяем TTL
      if (Date.now() > entry.expiresAt) {
        await this.delete(key)
        this.metrics.misses++
        return null
      }

      // Обновляем статистику доступа
      entry.accessCount++
      entry.lastAccessed = Date.now()

      // Автоматическое продление TTL для популярных элементов
      if (entry.accessCount >= 5 && entry.accessCount % 5 === 0) {
        entry.expiresAt = Date.now() + this.config.defaultTTL
        logger.debug('🔄 TTL extended for popular item', {
          key,
          accessCount: entry.accessCount,
        })
      }

      this.metrics.hits++
      this.metrics.totalAccessTime += Date.now() - startTime

      // Десериализация
      const value = await this.deserializeValue(entry)

      logger.debug('✅ Cache GET hit', {
        key,
        accessCount: entry.accessCount,
        compressed: entry.compressed,
        duration: Date.now() - startTime,
      })

      return value
    } catch (error) {
      logger.error('❌ Cache GET error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      this.metrics.misses++
      return null
    }
  }

  /**
   * Удалить ключ из кэша
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false

      // Удаляем из memory cache
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key)!
        this.metrics.memoryUsage -= entry.originalSize // Используем originalSize
        this.memoryCache.delete(key)
        deleted = true
      }

      // Удаляем из file cache
      if (this.config.enableFileCache) {
        const filePath = this.getFilePath(key)
        try {
          await fs.unlink(filePath)
          deleted = true
        } catch (error) {
          // Файл может не существовать
        }
      }

      // Удаляем зависимости
      this.removeDependencies(key)

      if (deleted) {
        this.metrics.deletes++
        logger.debug('🗑️ Cache DELETE', { key })
      }

      return deleted
    } catch (error) {
      logger.error('❌ Cache DELETE error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  /**
   * Проверить существование ключа
   */
  async has(key: string): Promise<boolean> {
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!
      return Date.now() <= entry.expiresAt
    }

    if (this.config.enableFileCache) {
      const filePath = this.getFilePath(key)
      try {
        await fs.access(filePath)
        return true
      } catch {
        return false
      }
    }

    return false
  }

  /**
   * Получить TTL ключа
   */
  async getTTL(key: string): Promise<number> {
    const entry = this.memoryCache.get(key)
    if (!entry) return -1

    const remaining = entry.expiresAt - Date.now()
    return remaining > 0 ? remaining : -1
  }

  /**
   * Массовые операции
   */
  async setMany(
    items: Record<string, any>,
    options?: Partial<CacheOptions>
  ): Promise<void> {
    const promises = Object.entries(items).map(([key, value]) =>
      this.set(key, value, options)
    )
    await Promise.all(promises)
  }

  async getMany(keys: string[]): Promise<Record<string, any>> {
    const promises = keys.map(async key => ({
      key,
      value: await this.get(key),
    }))

    const results = await Promise.all(promises)
    return results.reduce((acc, { key, value }) => {
      acc[key] = value
      return acc
    }, {} as Record<string, any>)
  }

  async deleteMany(keys: string[]): Promise<number> {
    const promises = keys.map(key => this.delete(key))
    const results = await Promise.all(promises)
    return results.filter(Boolean).length
  }

  /**
   * Инвалидация зависимостей
   */
  async invalidateDependencies(parentKey: string): Promise<void> {
    const dependents = this.dependencyMap.get(parentKey)
    if (!dependents) return

    const visited = new Set<string>()
    const toDelete = new Set<string>()

    const collectDependents = (key: string) => {
      if (visited.has(key)) return
      visited.add(key)

      const children = this.dependencyMap.get(key)
      if (children) {
        children.forEach(child => {
          // Не добавляем родительский ключ в список для удаления
          if (child !== parentKey) {
            toDelete.add(child)
            collectDependents(child)
          }
        })
      }
    }

    collectDependents(parentKey)

    // Удаляем все зависимые ключи (кроме самого parentKey)
    for (const key of toDelete) {
      await this.delete(key)
    }

    logger.info('🔄 Dependencies invalidated', {
      parentKey,
      deletedCount: toDelete.size,
    })
  }

  /**
   * Очистка просроченных элементов
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0

    // Очистка memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        await this.delete(key)
        cleanedCount++
      }
    }

    // Очистка file cache
    if (this.config.enableFileCache) {
      try {
        const files = await fs.readdir(this.config.fileCacheDir)
        for (const file of files) {
          if (file.endsWith('.cache')) {
            const filePath = path.join(this.config.fileCacheDir, file)
            const stats = await fs.stat(filePath)

            // Удаляем файлы старше TTL
            if (now - stats.mtime.getTime() > this.config.defaultTTL) {
              await fs.unlink(filePath)
              cleanedCount++
            }
          }
        }
      } catch (error) {
        logger.warn('⚠️ File cache cleanup error', { error })
      }
    }

    this.metrics.lastCleanup = now

    if (cleanedCount > 0) {
      logger.info('🧹 Cache cleanup completed', { cleanedCount })
    }

    return cleanedCount
  }

  /**
   * Полная очистка кэша
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    this.dependencyMap.clear()
    this.metrics.memoryUsage = 0

    if (this.config.enableFileCache) {
      try {
        const files = await fs.readdir(this.config.fileCacheDir)
        for (const file of files) {
          if (file.endsWith('.cache')) {
            await fs.unlink(path.join(this.config.fileCacheDir, file))
          }
        }
      } catch (error) {
        logger.warn('⚠️ File cache clear error', { error })
      }
    }

    logger.info('🧹 Cache cleared completely')
  }

  /**
   * Получить статистику кэша
   */
  getStats(): CacheStats {
    const totalRequests = this.metrics.hits + this.metrics.misses
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0
    const averageAccessTime =
      totalRequests > 0 ? this.metrics.totalAccessTime / totalRequests : 0
    const compressionRatio =
      this.metrics.compressionSaved > 0
        ? this.metrics.compressionSaved /
          (this.metrics.memoryUsage + this.metrics.compressionSaved)
        : 0

    return {
      totalKeys: this.memoryCache.size,
      memoryKeys: this.memoryCache.size,
      fileKeys: 0, // TODO: подсчитать файловые ключи
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate,
      memoryUsage: this.metrics.memoryUsage,
      compressionRatio,
      lastCleanup: new Date(this.metrics.lastCleanup).toISOString(),
      averageAccessTime,
    }
  }

  /**
   * Сброс статистики
   */
  resetStats(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      memoryUsage: 0,
      totalAccessTime: 0,
      compressionSaved: 0,
      lastCleanup: Date.now(),
    }
    logger.info('📊 Cache stats reset')
  }

  /**
   * Остановка менеджера кэша
   */
  async stop(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    await this.cleanup()
    logger.info('🛑 CacheManager stopped')
    this.stopped = true
  }

  // === PRIVATE METHODS ===

  private async serializeValue(
    value: any,
    options: CacheOptions
  ): Promise<{
    data: Buffer | string
    size: number
    compressed: boolean
    originalSize: number
  } | null> {
    try {
      const jsonString = JSON.stringify(value)
      const size = Buffer.byteLength(jsonString, 'utf8')

      // Определяем нужно ли сжатие
      const shouldCompress =
        options.compress ?? size > this.config.compressionThreshold

      if (shouldCompress) {
        logger.debug('🗜️ Compressing data', { originalSize: size })
        const compressed = await gzipAsync(jsonString)
        this.metrics.compressionSaved += size - compressed.length
        return {
          data: compressed,
          size: compressed.length,
          compressed: true,
          originalSize: size,
        }
      }

      return {
        data: jsonString,
        size,
        compressed: false,
        originalSize: size,
      }
    } catch (error) {
      logger.error('❌ Cache serialization error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private async deserializeValue(entry: CacheEntry): Promise<any> {
    try {
      let jsonString: string

      if (entry.compressed) {
        const decompressed = await gunzipAsync(entry.value as Buffer)
        jsonString = decompressed.toString('utf8')
      } else {
        jsonString = entry.value as string
      }

      return JSON.parse(jsonString)
    } catch (error) {
      logger.error('❌ Cache deserialization error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private determineCacheLevel(
    entry: CacheEntry,
    options: CacheOptions
  ): CacheLevel {
    if (options.level !== CacheLevel.AUTO) {
      return options.level
    }

    // Автоматическое определение уровня
    if (entry.size > this.config.compressionThreshold) {
      return CacheLevel.FILE
    }

    return CacheLevel.MEMORY
  }

  private async setMemoryCache(key: string, entry: CacheEntry): Promise<void> {
    // Проверяем лимит памяти (используем originalSize для подсчета)
    const totalNeeded = this.metrics.memoryUsage + entry.originalSize
    if (totalNeeded > this.config.maxMemorySize) {
      // Вычисляем точно сколько нужно освободить
      const neededToFree = totalNeeded - this.config.maxMemorySize
      await this.evictMemoryCache(neededToFree)
    }

    this.memoryCache.set(key, entry)
    this.metrics.memoryUsage += entry.originalSize // Используем originalSize
  }

  private async evictMemoryCache(neededSize: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())

    if (this.config.strategy === CacheStrategy.LRU) {
      // Сортируем по времени последнего доступа (старые первыми)
      entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
    } else if (this.config.strategy === CacheStrategy.LFU) {
      // Сортируем по частоте доступа (менее частые первыми)
      entries.sort(([, a], [, b]) => a.accessCount - b.accessCount)
    }

    let freedSize = 0
    const keysToDelete: string[] = []

    // Удаляем элементы по одному, пока не освободим достаточно места
    for (const [key, entry] of entries) {
      keysToDelete.push(key)
      freedSize += entry.originalSize

      // Проверяем после каждого добавления, достаточно ли места
      if (freedSize >= neededSize) {
        break
      }
    }

    // Удаляем выбранные ключи
    for (const key of keysToDelete) {
      await this.delete(key)
    }

    logger.debug('🗑️ Memory cache evicted', {
      freedSize,
      neededSize,
      strategy: this.config.strategy,
      deletedKeys: keysToDelete.length,
      deletedKeysList: keysToDelete,
    })
  }

  private async setFileCache(key: string, entry: CacheEntry): Promise<void> {
    if (!this.config.enableFileCache) return

    try {
      const filePath = this.getFilePath(key)
      const data = {
        value: entry.value,
        expiresAt: entry.expiresAt,
        compressed: entry.compressed,
      }

      await fs.writeFile(filePath, JSON.stringify(data), 'utf8')
    } catch (error) {
      logger.warn('⚠️ File cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      // Fallback to memory cache
      await this.setMemoryCache(key, entry)
    }
  }

  private async getFileCache(key: string): Promise<CacheEntry | null> {
    if (!this.config.enableFileCache) return null

    try {
      const filePath = this.getFilePath(key)
      const content = await fs.readFile(filePath, 'utf8')
      const data = JSON.parse(content)

      return {
        value: data.value,
        expiresAt: data.expiresAt,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: Buffer.byteLength(content, 'utf8'),
        originalSize: Buffer.byteLength(content, 'utf8'),
        compressed: data.compressed,
        level: CacheLevel.FILE,
      }
    } catch (error) {
      return null
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_')
    return path.join(this.config.fileCacheDir, `${safeKey}.cache`)
  }

  private updateDependencies(key: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.dependencyMap.has(dep)) {
        this.dependencyMap.set(dep, new Set())
      }
      this.dependencyMap.get(dep)!.add(key)
    }
  }

  private removeDependencies(key: string): void {
    // Удаляем ключ из всех зависимостей
    for (const [parent, children] of this.dependencyMap.entries()) {
      children.delete(key)
      if (children.size === 0) {
        this.dependencyMap.delete(parent)
      }
    }

    // Удаляем зависимости самого ключа
    this.dependencyMap.delete(key)
  }

  private async prefetchRelatedData(
    keys: string[],
    prefetchFn: Function
  ): Promise<void> {
    // Асинхронно prefetch данные
    setTimeout(async () => {
      for (const key of keys) {
        if (!(await this.has(key))) {
          try {
            const value = await prefetchFn(key)
            await this.set(key, value)
          } catch (error) {
            logger.warn('⚠️ Prefetch failed', { key, error })
          }
        }
      }
    }, 0)
  }

  private async ensureFileCacheDir(): Promise<void> {
    if (!this.config.enableFileCache) return

    try {
      await fs.mkdir(this.config.fileCacheDir, { recursive: true })
    } catch (error) {
      logger.warn('⚠️ Failed to create file cache directory', {
        dir: this.config.fileCacheDir,
        error,
      })
      this.config.enableFileCache = false
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('❌ Cleanup timer error', { error })
      })
    }, this.config.cleanupInterval)
  }

  // Add health check method for SystemHealthMonitor compatibility
  public isHealthy(): boolean {
    return !this.stopped && this.metrics.totalAccessTime >= 0
  }

  public getHealthStatus(): {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
    message?: string
    metrics?: Record<string, any>
  } {
    if (this.stopped) {
      return {
        status: 'CRITICAL',
        message: 'CacheManager is stopped',
        metrics: this.getStats(),
      }
    }

    const stats = this.getStats()
    const hitRate = stats.hits / (stats.hits + stats.misses) || 0

    if (hitRate < 0.5 && stats.hits + stats.misses > 100) {
      return {
        status: 'WARNING',
        message: `Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
        metrics: stats,
      }
    }

    return {
      status: 'HEALTHY',
      message: `Cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
      metrics: stats,
    }
  }
}
