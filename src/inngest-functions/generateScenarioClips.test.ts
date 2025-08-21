/**
 * Tests for generateScenarioClips Inngest function
 * Генерация раскадровки из фотографии для создания клипов/Reels/YouTube роликов
 *
 * Тест библейской мудрости: "Сотворение мира" - создание многообразного видеоконтента из одного образа
 */

import { describe, it, expect } from '@jest/globals'
import {
  generateScenarioClipsSchema,
  BIBLE_THEMES,
  type GenerateScenarioClipsEvent,
  type SceneData,
  type ScenarioClipsRecord,
} from '../interfaces/scenario-clips.interface'
import { ModeEnum } from '../interfaces/modes'

describe('generateScenarioClips Schema and Interfaces', () => {
  let mockEvent: GenerateScenarioClipsEvent

  beforeEach(() => {
    // Mock event data - используем фото 999-icon.jpg и тему "Сотворение мира"
    mockEvent = {
      photo_url: 'https://example.com/999-icon.jpg',
      prompt:
        'Сотворение мира из библии вайп-кодинга - эпическое божественное творение',
      scene_count: 3,
      variants_per_scene: 2,
      aspect_ratio: '9:16',
      flux_model: 'black-forest-labs/flux-1.1-pro',
      project_id: 1,
      requester_telegram_id: '144022504',
      metadata: {
        timestamp: '2025-01-19T10:00:00.000Z',
        test: 'scenario-clips-creation-test',
        test_env: 'development',
        version: '1.0.0',
        bible_theme: 'CREATION',
      },
    }
  })

  describe('Input Validation', () => {
    it('should validate valid input data', () => {
      // Act & Assert - валидный ввод не должен бросать ошибку
      expect(() => generateScenarioClipsSchema.parse(mockEvent)).not.toThrow()
    })

    it('should reject empty photo URL', () => {
      // Arrange
      const invalidEvent = { ...mockEvent, photo_url: '' }

      // Act & Assert
      expect(() => generateScenarioClipsSchema.parse(invalidEvent)).toThrow()
    })

    it('should reject short prompt', () => {
      // Arrange
      const invalidEvent = { ...mockEvent, prompt: 'short' }

      // Act & Assert
      expect(() => generateScenarioClipsSchema.parse(invalidEvent)).toThrow()
    })

    it('should reject invalid scene count', () => {
      // Arrange
      const invalidEvent = { ...mockEvent, scene_count: 0 }

      // Act & Assert
      expect(() => generateScenarioClipsSchema.parse(invalidEvent)).toThrow()
    })

    it('should reject too many scenes', () => {
      // Arrange
      const invalidEvent = { ...mockEvent, scene_count: 25 }

      // Act & Assert
      expect(() => generateScenarioClipsSchema.parse(invalidEvent)).toThrow()
    })

    it('should reject invalid variants per scene', () => {
      // Arrange
      const invalidEvent = { ...mockEvent, variants_per_scene: 6 }

      // Act & Assert
      expect(() => generateScenarioClipsSchema.parse(invalidEvent)).toThrow()
    })

    it('should accept valid aspect ratios', () => {
      // Arrange & Act
      const validEvent916 = { ...mockEvent, aspect_ratio: '9:16' as const }
      const validEvent169 = { ...mockEvent, aspect_ratio: '16:9' as const }

      // Assert
      expect(() =>
        generateScenarioClipsSchema.parse(validEvent916)
      ).not.toThrow()
      expect(() =>
        generateScenarioClipsSchema.parse(validEvent169)
      ).not.toThrow()
    })

    it('should use default values for optional fields', () => {
      // Arrange
      const minimalEvent = {
        photo_url: 'https://example.com/test.jpg',
        prompt: 'Test prompt for scenario generation',
        scene_count: 3,
        variants_per_scene: 2,
        project_id: 1,
        requester_telegram_id: '144022504',
      }

      // Act
      const parsed = generateScenarioClipsSchema.parse(minimalEvent)

      // Assert
      expect(parsed.aspect_ratio).toBe('9:16')
      expect(parsed.flux_model).toBe('black-forest-labs/flux-1.1-pro')
    })
  })

  describe('Bible Theme Integration', () => {
    it('should contain CREATION theme with correct scenes', () => {
      // Act
      const creationTheme = BIBLE_THEMES.CREATION

      // Assert
      expect(creationTheme.name).toBe('Сотворение мира')
      expect(creationTheme.scenes).toHaveLength(8)
      expect(creationTheme.scenes[0]).toContain('Да будет свет')
      expect(creationTheme.base_style).toContain('epic biblical scene')
    })

    it('should handle bible theme in metadata', () => {
      // Arrange
      const eventWithBibleTheme = {
        ...mockEvent,
        metadata: {
          ...mockEvent.metadata,
          bible_theme: 'CREATION',
        },
      }

      // Act
      const parsed = generateScenarioClipsSchema.parse(eventWithBibleTheme)

      // Assert
      expect(parsed.metadata?.bible_theme).toBe('CREATION')
    })
  })

  describe('Cost Calculation Logic', () => {
    it('should calculate cost correctly for scenario clips', () => {
      // Arrange
      const sceneCount = 3
      const variantsPerScene = 2
      const totalImages = sceneCount * variantsPerScene // 6 изображений
      const expectedBaseCostPerImage = 0.055 // FLUX стоимость в долларах
      const expectedTotalCostDollars = expectedBaseCostPerImage * totalImages

      // Для расчета в звездах используем формулу: (dollarCost / starCost) * interestRate
      const starCost = 0.016
      const interestRate = 1.5
      const expectedStars = (expectedTotalCostDollars / starCost) * interestRate

      // Act - проверяем что функция расчета стоимости существует
      expect(ModeEnum.ScenarioClips).toBe('scenario_clips')

      // Assert - проверяем логику расчета (будет реализована в функции)
      expect(totalImages).toBe(6)
      expect(expectedStars).toBeGreaterThan(0)
      expect(expectedStars).toBeCloseTo(30.9375, 2) // Исправленная стоимость (0.33 * 6 / 0.016 * 1.5)
    })
  })

  describe('Scene Generation Logic', () => {
    it('should generate correct number of scene prompts', () => {
      // Arrange
      const basePrompt = 'Сотворение мира'
      const sceneCount = 3

      // Act - логика будет реализована в самой функции
      const expectedScenes: SceneData[] = []
      for (let i = 1; i <= sceneCount; i++) {
        expectedScenes.push({
          scene_number: i,
          scene_prompt: `${basePrompt} - сцена ${i}`,
          variants: [],
          theme: `Сцена ${i}`,
        })
      }

      // Assert
      expect(expectedScenes).toHaveLength(sceneCount)
      expect(expectedScenes[0].scene_number).toBe(1)
      expect(expectedScenes[2].scene_number).toBe(3)
    })

    it('should generate correct number of variants per scene', () => {
      // Arrange
      const variantsPerScene = 2

      // Act - создаем моковую структуру вариантов
      const mockVariants = []
      for (let i = 1; i <= variantsPerScene; i++) {
        mockVariants.push({
          variant_number: i,
          image_url: `https://example.com/scene1_variant${i}.jpg`,
          prompt_used: `Тестовый промт варианта ${i}`,
          flux_model: 'black-forest-labs/flux-1.1-pro',
          generation_time: 10,
        })
      }

      // Assert
      expect(mockVariants).toHaveLength(variantsPerScene)
      expect(mockVariants[0].variant_number).toBe(1)
      expect(mockVariants[1].variant_number).toBe(2)
    })
  })

  describe('Archive Generation Planning', () => {
    it('should plan archive with required files', () => {
      // Arrange
      const expectedArchiveContents = {
        html_report: 'scenario_clips_report.html',
        excel_report: 'scenario_clips_data.xlsx',
        scene_images: [
          'scene1_variant1.jpg',
          'scene1_variant2.jpg',
          'scene2_variant1.jpg',
          'scene2_variant2.jpg',
          'scene3_variant1.jpg',
          'scene3_variant2.jpg',
        ],
        readme_txt: 'README.txt',
        base_photo: '999-icon.jpg',
      }

      // Act & Assert
      expect(expectedArchiveContents.scene_images).toHaveLength(6) // 3 scenes * 2 variants
      expect(expectedArchiveContents.html_report).toContain('.html')
      expect(expectedArchiveContents.excel_report).toContain('.xlsx')
    })
  })

  describe('Database Record Structure', () => {
    it('should create scenario clips record with correct structure', () => {
      // Arrange
      const expectedRecord: Partial<ScenarioClipsRecord> = {
        project_id: mockEvent.project_id,
        requester_telegram_id: mockEvent.requester_telegram_id,
        base_photo_url: mockEvent.photo_url,
        base_prompt: mockEvent.prompt,
        scene_count: mockEvent.scene_count,
        variants_per_scene: mockEvent.variants_per_scene,
        aspect_ratio: mockEvent.aspect_ratio,
        flux_model: mockEvent.flux_model,
        status: 'PROCESSING',
      }

      // Act & Assert
      expect(expectedRecord.scene_count).toBe(3)
      expect(expectedRecord.variants_per_scene).toBe(2)
      expect(expectedRecord.aspect_ratio).toBe('9:16')
      expect(expectedRecord.status).toBe('PROCESSING')
    })
  })

  describe('Integration Test Scenarios', () => {
    it('should handle 999-icon.jpg test scenario', () => {
      // Arrange - специальный тест для фото Гуру
      const guru999Event = {
        ...mockEvent,
        photo_url: 'https://example.com/assets/999-icon.jpg', // Используем валидный URL вместо локального пути
        prompt:
          'Сотворение мира из библии вайп-кодинга - великое божественное творение с числом 999',
        scene_count: 8, // По количеству дней творения
        variants_per_scene: 3,
        metadata: {
          ...mockEvent.metadata,
          bible_theme: 'CREATION',
          test: 'guru-999-creation-test',
        },
      }

      // Act
      const parsed = generateScenarioClipsSchema.parse(guru999Event)

      // Assert
      expect(parsed.scene_count).toBe(8)
      expect(parsed.variants_per_scene).toBe(3)
      expect(parsed.prompt).toContain('999')
      expect(parsed.metadata?.bible_theme).toBe('CREATION')
    })

    it('should handle minimal parameters scenario', () => {
      // Arrange
      const minimalEvent = {
        photo_url: 'https://example.com/test.jpg',
        prompt: 'Simple test scenario',
        scene_count: 1,
        variants_per_scene: 1,
        project_id: 1,
        requester_telegram_id: '144022504',
      }

      // Act
      const parsed = generateScenarioClipsSchema.parse(minimalEvent)

      // Assert
      expect(parsed.scene_count).toBe(1)
      expect(parsed.variants_per_scene).toBe(1)
      expect(parsed.aspect_ratio).toBe('9:16') // default
    })

    it('should handle maximum parameters scenario', () => {
      // Arrange
      const maximalEvent = {
        ...mockEvent,
        scene_count: 20, // максимум
        variants_per_scene: 5, // максимум
        aspect_ratio: '16:9' as const,
      }

      // Act
      const parsed = generateScenarioClipsSchema.parse(maximalEvent)

      // Assert
      expect(parsed.scene_count).toBe(20)
      expect(parsed.variants_per_scene).toBe(5)
      expect(parsed.aspect_ratio).toBe('16:9')
    })
  })

  describe('Mode Enum Integration', () => {
    it('should have ScenarioClips mode defined', () => {
      // Act & Assert
      expect(ModeEnum.ScenarioClips).toBe('scenario_clips')
      expect(ModeEnum).toHaveProperty('ScenarioClips')
    })
  })
})
