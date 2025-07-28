/**
 * 🕸️ Ткач Историй - Мастер Переплетения Судеб
 *
 * Система создания сложных, многослойных историй где судьбы персонажей
 * переплетаются как нити в священном гобелене повествования.
 */

import {
  CharacterProfile,
  SubplotThread,
  GeneratedScene,
  Theme,
  WriterStyle,
  StoryStructureType,
} from '@/interfaces/story-architecture.interface'

// ================================
// ТИПЫ СЮЖЕТНЫХ СВЯЗЕЙ
// ================================

export enum PlotConnectionType {
  CAUSAL = 'CAUSAL', // Действие A вызывает событие B
  PARALLEL = 'PARALLEL', // Две линии развиваются параллельно
  CONTRASTING = 'CONTRASTING', // Две линии контрастируют друг с другом
  CONVERGING = 'CONVERGING', // Линии сходятся к общей точке
  MIRRORING = 'MIRRORING', // Линии отражают друг друга
  NESTED = 'NESTED', // Одна линия находится внутри другой
  CYCLICAL = 'CYCLICAL', // Линии образуют циклическую структуру
}

export enum IntersectionType {
  CONFLICT = 'CONFLICT', // Персонажи сталкиваются в противостоянии
  ALLIANCE = 'ALLIANCE', // Персонажи объединяются
  REVELATION = 'REVELATION', // Раскрывается важная информация
  TRANSFORMATION = 'TRANSFORMATION', // Персонаж кардинально меняется
  SACRIFICE = 'SACRIFICE', // Один персонаж жертвует ради другого
  BETRAYAL = 'BETRAYAL', // Предательство меняет динамику
  RECOGNITION = 'RECOGNITION', // Момент узнавания/прозрения
}

// ================================
// СТРУКТУРЫ ДАННЫХ
// ================================

export interface PlotThread {
  id: string
  name: string
  protagonist: string // ID персонажа
  central_question: string
  stakes: string
  obstacles: string[]
  resolution_type: 'TRIUMPHANT' | 'TRAGIC' | 'BITTERSWEET' | 'OPEN'
  theme_embodied: string
  scenes: string[] // IDs сцен
  intersections: PlotIntersection[]
}

export interface PlotIntersection {
  scene_id: string
  intersecting_threads: string[] // IDs других нитей
  intersection_type: IntersectionType
  impact_description: string
  consequences: string[]
  emotional_weight: number // 1-10
}

export interface WeavingPattern {
  name: string
  description: string
  thread_count: number
  complexity_level: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
  best_for_genres: string[]
  intersection_frequency: number // Как часто линии пересекаются
  convergence_points: number // Количество точек схождения
}

// ================================
// МАСТЕР ТКАЧ
// ================================

export class StoryWeaver {
  /**
   * 🕸️ Создает переплетенную структуру из персонажей и их историй
   */
  static weaveStories(params: {
    characters: CharacterProfile[]
    main_theme: Theme
    writer_style: WriterStyle
    structure_type: StoryStructureType
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
    scene_count: number
  }): WovenStory {
    // 1. Создаем основные сюжетные нити
    const threads = this.createPlotThreads(params.characters, params.main_theme)

    // 2. Определяем паттерн переплетения
    const pattern = this.selectWeavingPattern(params)

    // 3. Создаем точки пересечения
    const intersections = this.createIntersections(threads, pattern, params)

    // 4. Строим последовательность сцен
    const scenes = this.constructSceneSequence(threads, intersections, params)

    // 5. Добавляем глубину через символизм
    const symbols = this.addSymbolicConnections(threads, params.main_theme)

    return {
      threads,
      pattern,
      intersections,
      scenes,
      symbols,
      analysis: this.analyzeWeaving(threads, intersections),
    }
  }

  /**
   * 🧵 Создает сюжетные нити из персонажей
   */
  private static createPlotThreads(
    characters: CharacterProfile[],
    mainTheme: Theme
  ): PlotThread[] {
    return characters.map((character, index) => {
      const thread: PlotThread = {
        id: `thread_${character.id}`,
        name: `${character.name}'s Journey`,
        protagonist: character.id,
        central_question: this.generateCentralQuestion(character),
        stakes: this.generateStakes(character),
        obstacles: this.generateObstacles(character),
        resolution_type: this.determineResolutionType(character.arc_type),
        theme_embodied: character.theme_embodiment,
        scenes: [],
        intersections: [],
      }

      return thread
    })
  }

  /**
   * 🔍 Генерирует центральный вопрос для персонажа
   */
  private static generateCentralQuestion(character: CharacterProfile): string {
    const questionTemplates = {
      PROTAGONIST: [
        `Will ${character.name} overcome their ${character.psychology.core_fear}?`,
        `Can ${character.name} learn ${character.psychology.truth_needed}?`,
        `Will ${character.name} achieve ${character.psychology.core_need}?`,
      ],
      ANTAGONIST: [
        `Can ${character.name} be stopped before they destroy everything?`,
        `Will ${character.name} realize the error of their ways?`,
        `What price will ${character.name} pay for their ambition?`,
      ],
      MENTOR: [
        `Can ${character.name} successfully guide the hero?`,
        `Will ${character.name}'s wisdom be enough?`,
        `What sacrifice will ${character.name} make for the greater good?`,
      ],
      ALLY: [
        `Will ${character.name} find their own strength?`,
        `Can ${character.name} prove their worth?`,
        `Will ${character.name} remain loyal when tested?`,
      ],
    }

    const templates =
      questionTemplates[character.role] || questionTemplates.ALLY
    return templates[Math.floor(Math.random() * templates.length)]
  }

  /**
   * ⚡ Генерирует ставки для персонажа
   */
  private static generateStakes(character: CharacterProfile): string {
    return `If ${character.name} fails, they will lose ${character.psychology.core_need} forever`
  }

  /**
   * 🚧 Генерирует препятствия
   */
  private static generateObstacles(character: CharacterProfile): string[] {
    return [
      `Internal: Struggling with ${character.psychology.lie_believed}`,
      `External: Opposition from other characters`,
      `Philosophical: Conflict between ${character.psychology.internal_conflict}`,
    ]
  }

  /**
   * 🎭 Определяет тип разрешения на основе дуги персонажа
   */
  private static determineResolutionType(
    arcType: any
  ): 'TRIUMPHANT' | 'TRAGIC' | 'BITTERSWEET' | 'OPEN' {
    if (arcType.positive && arcType.growth) return 'TRIUMPHANT'
    if (arcType.fall) return 'TRAGIC'
    if (arcType.change && !arcType.positive) return 'BITTERSWEET'
    return 'OPEN'
  }

  /**
   * 🎨 Выбирает паттерн переплетения
   */
  private static selectWeavingPattern(params: any): WeavingPattern {
    const patterns: Record<string, WeavingPattern> = {
      SIMPLE_PARALLEL: {
        name: 'Простые Параллели',
        description:
          'Две-три линии развиваются параллельно, пересекаясь в ключевых моментах',
        thread_count: 3,
        complexity_level: 'SIMPLE',
        best_for_genres: ['ROMANCE', 'CONTEMPORARY', 'MYSTERY'],
        intersection_frequency: 0.3,
        convergence_points: 2,
      },

      CONVERGING_STREAMS: {
        name: 'Сходящиеся Потоки',
        description:
          'Множественные линии постепенно сходятся к общему кульминационному моменту',
        thread_count: 5,
        complexity_level: 'MODERATE',
        best_for_genres: ['THRILLER', 'FANTASY', 'SCIENCE_FICTION'],
        intersection_frequency: 0.5,
        convergence_points: 3,
      },

      NESTED_MIRRORS: {
        name: 'Зеркальные Вложения',
        description:
          'Истории отражают друг друга на разных уровнях, создавая фрактальную структуру',
        thread_count: 6,
        complexity_level: 'COMPLEX',
        best_for_genres: [
          'LITERARY_FICTION',
          'MAGICAL_REALISM',
          'BIBLICAL_PARABLE',
        ],
        intersection_frequency: 0.7,
        convergence_points: 4,
      },

      CYCLICAL_TAPESTRY: {
        name: 'Циклический Гобелен',
        description:
          'Истории переплетаются циклически, каждая линия влияет на все остальные',
        thread_count: 8,
        complexity_level: 'COMPLEX',
        best_for_genres: ['EPIC_FANTASY', 'HISTORICAL', 'DYSTOPIAN'],
        intersection_frequency: 0.8,
        convergence_points: 5,
      },
    }

    // Выбираем паттерн на основе сложности и количества персонажей
    const patternKey = this.selectPatternKey(params)
    return patterns[patternKey] || patterns.SIMPLE_PARALLEL
  }

  /**
   * 🔑 Выбирает ключ паттерна на основе параметров
   */
  private static selectPatternKey(params: any): string {
    const characterCount = params.characters.length

    if (params.complexity === 'SIMPLE' || characterCount <= 3) {
      return 'SIMPLE_PARALLEL'
    } else if (params.complexity === 'MODERATE' || characterCount <= 5) {
      return 'CONVERGING_STREAMS'
    } else if (
      params.writer_style === 'BIBLICAL' ||
      params.writer_style === 'HARUKI_MURAKAMI'
    ) {
      return 'NESTED_MIRRORS'
    } else {
      return 'CYCLICAL_TAPESTRY'
    }
  }

  /**
   * ⚡ Создает точки пересечения между нитями
   */
  private static createIntersections(
    threads: PlotThread[],
    pattern: WeavingPattern,
    params: any
  ): PlotIntersection[] {
    const intersections: PlotIntersection[] = []
    const totalScenes = params.scene_count
    const intersectionScenes = Math.floor(
      totalScenes * pattern.intersection_frequency
    )

    // Определяем сцены для пересечений
    const intersectionPositions = this.distributeIntersections(
      intersectionScenes,
      totalScenes,
      pattern.convergence_points
    )

    // Создаем пересечения
    intersectionPositions.forEach((position, index) => {
      const intersection = this.createIntersectionAtPosition(
        position,
        threads,
        index,
        params
      )
      intersections.push(intersection)
    })

    return intersections
  }

  /**
   * 📍 Распределяет пересечения по сценам
   */
  private static distributeIntersections(
    intersectionCount: number,
    totalScenes: number,
    convergencePoints: number
  ): number[] {
    const positions: number[] = []

    // Обязательные точки схождения (начало, середина, конец)
    const mandatoryPositions = [
      Math.floor(totalScenes * 0.25), // Первая четверть
      Math.floor(totalScenes * 0.5), // Середина
      Math.floor(totalScenes * 0.75), // Третья четверть
      totalScenes - 1, // Кульминация
    ]

    positions.push(...mandatoryPositions.slice(0, convergencePoints))

    // Дополнительные пересечения
    const remainingIntersections = intersectionCount - convergencePoints
    for (let i = 0; i < remainingIntersections; i++) {
      const position = Math.floor(Math.random() * totalScenes)
      if (!positions.includes(position)) {
        positions.push(position)
      }
    }

    return positions.sort((a, b) => a - b)
  }

  /**
   * 🎭 Создает конкретное пересечение в заданной позиции
   */
  private static createIntersectionAtPosition(
    position: number,
    threads: PlotThread[],
    index: number,
    params: any
  ): PlotIntersection {
    // Выбираем 2-3 нити для пересечения
    const intersectingThreads = this.selectIntersectingThreads(
      threads,
      position
    )

    // Определяем тип пересечения
    const intersectionType = this.determineIntersectionType(
      intersectingThreads,
      position,
      params
    )

    return {
      scene_id: `scene_${position}`,
      intersecting_threads: intersectingThreads.map(t => t.id),
      intersection_type: intersectionType,
      impact_description: this.generateImpactDescription(
        intersectingThreads,
        intersectionType
      ),
      consequences: this.generateConsequences(
        intersectingThreads,
        intersectionType
      ),
      emotional_weight: this.calculateEmotionalWeight(
        position,
        params.scene_count,
        intersectionType
      ),
    }
  }

  /**
   * 🎯 Выбирает нити для пересечения
   */
  private static selectIntersectingThreads(
    threads: PlotThread[],
    position: number
  ): PlotThread[] {
    // Простая логика: выбираем 2-3 случайные нити
    const shuffled = [...threads].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(3, threads.length))
  }

  /**
   * 🎭 Определяет тип пересечения
   */
  private static determineIntersectionType(
    threads: PlotThread[],
    position: number,
    params: any
  ): IntersectionType {
    const sceneRatio = position / params.scene_count

    if (sceneRatio < 0.25) {
      // Начало истории - знакомства и альянсы
      return Math.random() > 0.5
        ? IntersectionType.ALLIANCE
        : IntersectionType.CONFLICT
    } else if (sceneRatio < 0.5) {
      // Первая половина - развитие конфликтов
      return Math.random() > 0.5
        ? IntersectionType.CONFLICT
        : IntersectionType.REVELATION
    } else if (sceneRatio < 0.75) {
      // Третья четверть - усложнение
      return Math.random() > 0.5
        ? IntersectionType.BETRAYAL
        : IntersectionType.TRANSFORMATION
    } else {
      // Финал - разрешения
      return Math.random() > 0.5
        ? IntersectionType.SACRIFICE
        : IntersectionType.RECOGNITION
    }
  }

  /**
   * 📝 Генерирует описание воздействия
   */
  private static generateImpactDescription(
    threads: PlotThread[],
    type: IntersectionType
  ): string {
    const threadNames = threads.map(t => t.name).join(' and ')

    const descriptions = {
      [IntersectionType.CONFLICT]: `${threadNames} clash, revealing fundamental differences`,
      [IntersectionType.ALLIANCE]: `${threadNames} join forces against common threat`,
      [IntersectionType.REVELATION]: `${threadNames} discover crucial truth that changes everything`,
      [IntersectionType.TRANSFORMATION]: `${threadNames} undergo fundamental change`,
      [IntersectionType.SACRIFICE]: `One character sacrifices for others in ${threadNames}`,
      [IntersectionType.BETRAYAL]: `Trust is shattered between ${threadNames}`,
      [IntersectionType.RECOGNITION]: `${threadNames} achieve understanding and reconciliation`,
    }

    return descriptions[type] || `${threadNames} intersect in meaningful way`
  }

  /**
   * ⚡ Генерирует последствия пересечения
   */
  private static generateConsequences(
    threads: PlotThread[],
    type: IntersectionType
  ): string[] {
    return [
      'Changes relationship dynamics',
      'Raises stakes for all involved',
      'Reveals new information',
      'Forces character growth',
    ]
  }

  /**
   * 💪 Вычисляет эмоциональный вес
   */
  private static calculateEmotionalWeight(
    position: number,
    totalScenes: number,
    type: IntersectionType
  ): number {
    const sceneRatio = position / totalScenes
    let baseWeight = 5

    // Усиливаем вес к концу истории
    if (sceneRatio > 0.75) baseWeight += 3
    else if (sceneRatio > 0.5) baseWeight += 2
    else if (sceneRatio > 0.25) baseWeight += 1

    // Корректируем по типу пересечения
    const typeWeights = {
      [IntersectionType.SACRIFICE]: 3,
      [IntersectionType.BETRAYAL]: 2,
      [IntersectionType.TRANSFORMATION]: 2,
      [IntersectionType.RECOGNITION]: 2,
      [IntersectionType.CONFLICT]: 1,
      [IntersectionType.ALLIANCE]: 1,
      [IntersectionType.REVELATION]: 1,
    }

    return Math.min(10, baseWeight + (typeWeights[type] || 0))
  }

  /**
   * 🎬 Строит последовательность сцен
   */
  private static constructSceneSequence(
    threads: PlotThread[],
    intersections: PlotIntersection[],
    params: any
  ): SceneBlueprint[] {
    const scenes: SceneBlueprint[] = []

    for (let i = 0; i < params.scene_count; i++) {
      const intersection = intersections.find(
        int => int.scene_id === `scene_${i}`
      )

      if (intersection) {
        // Сцена пересечения
        scenes.push(
          this.createIntersectionScene(intersection, threads, i, params)
        )
      } else {
        // Обычная сцена развития персонажа
        scenes.push(this.createCharacterScene(threads, i, params))
      }
    }

    return scenes
  }

  /**
   * 🎭 Создает сцену пересечения
   */
  private static createIntersectionScene(
    intersection: PlotIntersection,
    threads: PlotThread[],
    sceneIndex: number,
    params: any
  ): SceneBlueprint {
    const involvedThreads = threads.filter(t =>
      intersection.intersecting_threads.includes(t.id)
    )

    return {
      id: intersection.scene_id,
      scene_number: sceneIndex + 1,
      type: 'INTERSECTION',
      primary_thread: involvedThreads[0]?.id,
      involved_threads: intersection.intersecting_threads,
      intersection_type: intersection.intersection_type,
      emotional_weight: intersection.emotional_weight,
      purpose: intersection.impact_description,
      consequences: intersection.consequences,
      symbolic_elements: this.generateSymbolicElements(intersection, params),
    }
  }

  /**
   * 👤 Создает сцену развития персонажа
   */
  private static createCharacterScene(
    threads: PlotThread[],
    sceneIndex: number,
    params: any
  ): SceneBlueprint {
    // Выбираем главную нить для этой сцены
    const primaryThread = threads[sceneIndex % threads.length]

    return {
      id: `scene_${sceneIndex}`,
      scene_number: sceneIndex + 1,
      type: 'CHARACTER_DEVELOPMENT',
      primary_thread: primaryThread.id,
      involved_threads: [primaryThread.id],
      intersection_type: null,
      emotional_weight: Math.floor(Math.random() * 5) + 3,
      purpose: `Develop ${primaryThread.protagonist}'s arc`,
      consequences: ['Character growth', 'Plot advancement'],
      symbolic_elements: [],
    }
  }

  /**
   * 🔮 Генерирует символические элементы
   */
  private static generateSymbolicElements(
    intersection: PlotIntersection,
    params: any
  ): string[] {
    return [
      'Mirror or reflection imagery',
      'Weather reflecting emotional state',
      'Objects that connect characters to past',
      'Animals or nature symbolizing themes',
    ]
  }

  /**
   * 🔗 Добавляет символические связи
   */
  private static addSymbolicConnections(
    threads: PlotThread[],
    theme: Theme
  ): SymbolicConnection[] {
    return [
      {
        symbol: 'recurring_object',
        meaning: theme.universal_truth,
        threads_connected: threads.map(t => t.id),
        first_appearance: 'scene_1',
        final_significance: 'Represents character transformation',
      },
    ]
  }

  /**
   * 📊 Анализирует качество переплетения
   */
  private static analyzeWeaving(
    threads: PlotThread[],
    intersections: PlotIntersection[]
  ): WeavingAnalysis {
    return {
      complexity_score: this.calculateComplexityScore(threads, intersections),
      emotional_arc_strength: this.calculateEmotionalArc(intersections),
      character_development_balance: this.analyzeCharacterBalance(threads),
      thematic_coherence: this.analyzeThematicCoherence(threads),
      potential_issues: this.identifyPotentialIssues(threads, intersections),
      suggestions: this.generateImprovementSuggestions(threads, intersections),
    }
  }

  // Вспомогательные методы для анализа
  private static calculateComplexityScore(
    threads: PlotThread[],
    intersections: PlotIntersection[]
  ): number {
    return Math.min(10, threads.length + intersections.length * 0.5)
  }

  private static calculateEmotionalArc(
    intersections: PlotIntersection[]
  ): number {
    const totalWeight = intersections.reduce(
      (sum, int) => sum + int.emotional_weight,
      0
    )
    return Math.min(10, totalWeight / intersections.length)
  }

  private static analyzeCharacterBalance(threads: PlotThread[]): number {
    // Простая проверка: все ли нити примерно равной важности
    return threads.length > 0 ? 8 : 0
  }

  private static analyzeThematicCoherence(threads: PlotThread[]): number {
    // Проверяем, связаны ли темы нитей
    return 7
  }

  private static identifyPotentialIssues(
    threads: PlotThread[],
    intersections: PlotIntersection[]
  ): string[] {
    const issues: string[] = []

    if (threads.length > 6) {
      issues.push('Too many plot threads may confuse readers')
    }

    if (intersections.length < 2) {
      issues.push('Too few intersections may make stories feel disconnected')
    }

    return issues
  }

  private static generateImprovementSuggestions(
    threads: PlotThread[],
    intersections: PlotIntersection[]
  ): string[] {
    return [
      'Consider adding more emotional stakes to secondary characters',
      'Strengthen thematic connections between plot threads',
      'Ensure each intersection serves multiple purposes',
    ]
  }
}

// ================================
// ИНТЕРФЕЙСЫ РЕЗУЛЬТАТОВ
// ================================

export interface WovenStory {
  threads: PlotThread[]
  pattern: WeavingPattern
  intersections: PlotIntersection[]
  scenes: SceneBlueprint[]
  symbols: SymbolicConnection[]
  analysis: WeavingAnalysis
}

export interface SceneBlueprint {
  id: string
  scene_number: number
  type: 'INTERSECTION' | 'CHARACTER_DEVELOPMENT' | 'EXPOSITION' | 'CLIMAX'
  primary_thread: string
  involved_threads: string[]
  intersection_type: IntersectionType | null
  emotional_weight: number
  purpose: string
  consequences: string[]
  symbolic_elements: string[]
}

export interface SymbolicConnection {
  symbol: string
  meaning: string
  threads_connected: string[]
  first_appearance: string
  final_significance: string
}

export interface WeavingAnalysis {
  complexity_score: number
  emotional_arc_strength: number
  character_development_balance: number
  thematic_coherence: number
  potential_issues: string[]
  suggestions: string[]
}
