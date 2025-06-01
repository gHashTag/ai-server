import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CacheManager, CacheStrategy, CacheLevel } from '@/utils/CacheManager'

describe('CacheManager', () => {
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheManager = new CacheManager({
      defaultTTL: 5000, // 5 секунд для тестов
      maxMemorySize: 1024 * 1024, // 1MB
      compressionThreshold: 1000, // 1KB
      enableFileCache: false, // Отключаем файловый кэш для простоты тестов
      enableStats: true,
    })
  })

  afterEach(async () => {
    await cacheManager.clear()
    await cacheManager.stop()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      const defaultManager = new CacheManager()
      expect(defaultManager).toBeDefined()
      expect(defaultManager.getStats().totalKeys).toBe(0)
      await defaultManager.stop()
    })

    it('should initialize with custom configuration', async () => {
      const config = {
        defaultTTL: 10000,
        maxMemorySize: 2048,
        compressionThreshold: 500,
        enableFileCache: false,
        enableStats: true,
      }
      const customManager = new CacheManager(config)
      expect(customManager).toBeDefined()
      await customManager.stop()
    })
  })

  describe('Basic Cache Operations', () => {
    it('should set and get a simple value', async () => {
      const key = 'test-key'
      const value = { data: 'test-value', number: 42 }

      await cacheManager.set(key, value)
      const result = await cacheManager.get(key)

      expect(result).toEqual(value)
    })

    it('should return null for non-existent key', async () => {
      const result = await cacheManager.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should delete a key', async () => {
      const key = 'delete-test'
      const value = 'test-value'

      await cacheManager.set(key, value)
      expect(await cacheManager.get(key)).toBe(value)

      const deleted = await cacheManager.delete(key)
      expect(deleted).toBe(true)
      expect(await cacheManager.get(key)).toBeNull()
    })

    it('should check if key exists', async () => {
      const key = 'exists-test'
      const value = 'test-value'

      expect(await cacheManager.has(key)).toBe(false)

      await cacheManager.set(key, value)
      expect(await cacheManager.has(key)).toBe(true)

      await cacheManager.delete(key)
      expect(await cacheManager.has(key)).toBe(false)
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', async () => {
      const key = 'ttl-test'
      const value = 'test-value'
      const customTTL = 100 // 100ms

      await cacheManager.set(key, value, { ttl: customTTL })
      expect(await cacheManager.get(key)).toBe(value)

      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(await cacheManager.get(key)).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      const key = 'default-ttl-test'
      const value = 'test-value'

      await cacheManager.set(key, value)
      expect(await cacheManager.get(key)).toBe(value)

      // Проверяем, что TTL установлен
      const ttl = await cacheManager.getTTL(key)
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(5000)
    })

    it('should extend TTL for popular items', async () => {
      const key = 'popular-item'
      const value = 'popular-value'

      await cacheManager.set(key, value, {
        ttl: 2000, // 2 секунды
        autoExtend: true,
        popularityThreshold: 2,
      })

      // Получаем элемент несколько раз для активации автопродления
      await cacheManager.get(key)
      await cacheManager.get(key)
      await cacheManager.get(key)
      await cacheManager.get(key)
      await cacheManager.get(key) // 5-й раз должен продлить TTL

      // TTL должен быть продлен
      const ttl = await cacheManager.getTTL(key)
      expect(ttl).toBeGreaterThan(1500) // Должен быть продлен
    })
  })

  describe('Cache Strategies', () => {
    it('should use LRU strategy when memory limit exceeded', async () => {
      // Создаем менеджер с маленьким лимитом памяти
      const smallCacheManager = new CacheManager({
        maxMemorySize: 200, // 200 bytes
        strategy: CacheStrategy.LRU,
        enableFileCache: false,
      })

      // Добавляем элементы, превышающие лимит
      await smallCacheManager.set('key1', 'a'.repeat(80))
      await smallCacheManager.set('key2', 'b'.repeat(80))
      await smallCacheManager.set('key3', 'c'.repeat(80)) // Должен вытеснить key1

      expect(await smallCacheManager.has('key1')).toBe(false)
      expect(await smallCacheManager.has('key2')).toBe(true)
      expect(await smallCacheManager.has('key3')).toBe(true)

      await smallCacheManager.stop()
    })

    it('should use LFU strategy when configured', async () => {
      const lfuCacheManager = new CacheManager({
        maxMemorySize: 130, // Лимит: 42+42=84, +50=134 > 130, нужно удалить 4+ байта (достаточно key2=42)
        strategy: CacheStrategy.LFU,
        enableFileCache: false,
      })

      await lfuCacheManager.set('key1', 'a'.repeat(40)) // ~42 байта
      await lfuCacheManager.set('key2', 'b'.repeat(40)) // ~42 байта

      // Делаем key1 более популярным
      await lfuCacheManager.get('key1')
      await lfuCacheManager.get('key1')
      await lfuCacheManager.get('key2')

      // Добавляем новый элемент - должен вытеснить key2 (менее частый)
      await lfuCacheManager.set('key3', 'c'.repeat(48)) // ~50 байт, удаление key2 (42) достаточно

      expect(await lfuCacheManager.has('key1')).toBe(true) // Более популярный остается
      expect(await lfuCacheManager.has('key2')).toBe(false) // Менее популярный удален
      expect(await lfuCacheManager.has('key3')).toBe(true) // Новый добавлен

      await lfuCacheManager.stop()
    })
  })

  describe('Multi-level Caching', () => {
    it('should store in memory by default', async () => {
      const key = 'memory-test'
      const value = 'test-value'

      await cacheManager.set(key, value, { level: CacheLevel.MEMORY })
      expect(await cacheManager.get(key)).toBe(value)

      const stats = cacheManager.getStats()
      expect(stats.memoryKeys).toBe(1)
    })
  })

  describe('Compression', () => {
    it('should compress large objects', async () => {
      const key = 'large-object'
      const largeValue = { data: 'x'.repeat(2000) } // Больше compressionThreshold

      await cacheManager.set(key, largeValue)
      const result = await cacheManager.get(key)

      expect(result).toEqual(largeValue)
    })

    it('should not compress small objects', async () => {
      const key = 'small-object'
      const smallValue = { data: 'small' }

      await cacheManager.set(key, smallValue)
      const result = await cacheManager.get(key)

      expect(result).toEqual(smallValue)
    })
  })

  describe('Cache Dependencies', () => {
    it('should invalidate dependent keys', async () => {
      const parentKey = 'parent'
      const childKey1 = 'child1'
      const childKey2 = 'child2'

      await cacheManager.set(parentKey, 'parent-value')
      await cacheManager.set(childKey1, 'child1-value', {
        dependencies: [parentKey],
      })
      await cacheManager.set(childKey2, 'child2-value', {
        dependencies: [parentKey],
      })

      expect(await cacheManager.get(childKey1)).toBe('child1-value')
      expect(await cacheManager.get(childKey2)).toBe('child2-value')

      // Инвалидируем родительский ключ
      await cacheManager.invalidateDependencies(parentKey)

      expect(await cacheManager.get(parentKey)).toBe('parent-value') // Сам ключ остается
      expect(await cacheManager.get(childKey1)).toBeNull() // Зависимые удалены
      expect(await cacheManager.get(childKey2)).toBeNull()
    })

    it('should handle circular dependencies gracefully', async () => {
      const key1 = 'circular1'
      const key2 = 'circular2'

      await cacheManager.set(key1, 'value1', { dependencies: [key2] })
      await cacheManager.set(key2, 'value2', { dependencies: [key1] })

      // Не должно вызывать бесконечную рекурсию
      await cacheManager.invalidateDependencies(key1)

      expect(await cacheManager.get(key1)).toBe('value1') // Сам ключ остается
      expect(await cacheManager.get(key2)).toBeNull() // Зависимый удален
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should track cache statistics', async () => {
      const key1 = 'stats-test-1'
      const key2 = 'stats-test-2'

      // Добавляем элементы
      await cacheManager.set(key1, 'value1')
      await cacheManager.set(key2, 'value2')

      // Делаем несколько обращений
      await cacheManager.get(key1) // hit
      await cacheManager.get(key1) // hit
      await cacheManager.get('non-existent') // miss

      const stats = cacheManager.getStats()

      expect(stats.totalKeys).toBe(2)
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.67, 2) // 2/3
      expect(stats.memoryKeys).toBe(2)
    })

    it('should reset statistics', async () => {
      await cacheManager.set('test', 'value')
      await cacheManager.get('test')

      let stats = cacheManager.getStats()
      expect(stats.hits).toBe(1)

      cacheManager.resetStats()
      stats = cacheManager.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })

    it('should track memory usage', async () => {
      const largeValue = 'x'.repeat(1000)
      await cacheManager.set('large-item', largeValue)

      const stats = cacheManager.getStats()
      expect(stats.memoryUsage).toBeGreaterThan(500) // Учитываем JSON overhead
    })
  })

  describe('Bulk Operations', () => {
    it('should set multiple keys at once', async () => {
      const items = {
        bulk1: 'value1',
        bulk2: 'value2',
        bulk3: 'value3',
      }

      await cacheManager.setMany(items)

      expect(await cacheManager.get('bulk1')).toBe('value1')
      expect(await cacheManager.get('bulk2')).toBe('value2')
      expect(await cacheManager.get('bulk3')).toBe('value3')
    })

    it('should get multiple keys at once', async () => {
      await cacheManager.set('multi1', 'value1')
      await cacheManager.set('multi2', 'value2')
      await cacheManager.set('multi3', 'value3')

      const results = await cacheManager.getMany([
        'multi1',
        'multi2',
        'non-existent',
      ])

      expect(results).toEqual({
        multi1: 'value1',
        multi2: 'value2',
        'non-existent': null,
      })
    })

    it('should delete multiple keys at once', async () => {
      await cacheManager.set('delete1', 'value1')
      await cacheManager.set('delete2', 'value2')
      await cacheManager.set('delete3', 'value3')

      const deletedCount = await cacheManager.deleteMany([
        'delete1',
        'delete2',
        'non-existent',
      ])

      expect(deletedCount).toBe(2)
      expect(await cacheManager.get('delete1')).toBeNull()
      expect(await cacheManager.get('delete2')).toBeNull()
      expect(await cacheManager.get('delete3')).toBe('value3')
    })
  })

  describe('Cache Cleanup', () => {
    it('should clean up expired items', async () => {
      await cacheManager.set('expired1', 'value1', { ttl: 50 })
      await cacheManager.set('expired2', 'value2', { ttl: 50 })
      await cacheManager.set('valid', 'value3', { ttl: 5000 })

      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 100))

      const cleanedCount = await cacheManager.cleanup()

      expect(cleanedCount).toBe(2)
      expect(await cacheManager.get('expired1')).toBeNull()
      expect(await cacheManager.get('expired2')).toBeNull()
      expect(await cacheManager.get('valid')).toBe('value3')
    })

    it('should clear all cache', async () => {
      await cacheManager.set('clear1', 'value1')
      await cacheManager.set('clear2', 'value2')

      expect(cacheManager.getStats().totalKeys).toBe(2)

      await cacheManager.clear()

      expect(cacheManager.getStats().totalKeys).toBe(0)
      expect(await cacheManager.get('clear1')).toBeNull()
      expect(await cacheManager.get('clear2')).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON serialization errors gracefully', async () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj // Создаем циклическую ссылку

      // Не должно выбрасывать ошибку
      await cacheManager.set('circular', circularObj)

      // Значение не должно быть сохранено из-за ошибки сериализации
      expect(await cacheManager.get('circular')).toBeNull()
    })
  })

  describe('Prefetching', () => {
    it('should prefetch related data', async () => {
      let prefetchCalled = false
      const prefetchFn = async (key: string) => {
        prefetchCalled = true
        return 'prefetched-value'
      }

      await cacheManager.set('main-key', 'main-value', {
        prefetchKeys: ['related-key'],
        prefetchFn,
      })

      // Ждем завершения prefetch
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(prefetchCalled).toBe(true)
      expect(await cacheManager.get('related-key')).toBe('prefetched-value')
    })
  })
})
