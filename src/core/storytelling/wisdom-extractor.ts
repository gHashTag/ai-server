/**
 * 💎 Экстрактор Мудрости - Искатель Вечных Истин
 *
 * Система извлечения глубоких жизненных уроков, философских инсайтов
 * и универсальных истин из сгенерированных историй.
 */

import {
  WisdomExtraction,
  Theme,
  CharacterProfile,
  WriterStyle,
  StoryGenre,
} from '@/interfaces/story-architecture.interface'
import { WovenStory, SceneBlueprint } from './story-weaver'

// ================================
// ТИПЫ МУДРОСТИ
// ================================

export enum WisdomType {
  MORAL_LESSON = 'MORAL_LESSON', // Моральный урок
  PHILOSOPHICAL_INSIGHT = 'PHILOSOPHICAL_INSIGHT', // Философский инсайт
  PRACTICAL_WISDOM = 'PRACTICAL_WISDOM', // Практическая мудрость
  UNIVERSAL_TRUTH = 'UNIVERSAL_TRUTH', // Универсальная истина
  EMOTIONAL_RESONANCE = 'EMOTIONAL_RESONANCE', // Эмоциональный резонанс
  SPIRITUAL_AWAKENING = 'SPIRITUAL_AWAKENING', // Духовное пробуждение
}

export enum WisdomSource {
  CHARACTER_TRANSFORMATION = 'CHARACTER_TRANSFORMATION',
  PLOT_RESOLUTION = 'PLOT_RESOLUTION',
  THEMATIC_EXPLORATION = 'THEMATIC_EXPLORATION',
  SYMBOLIC_MEANING = 'SYMBOLIC_MEANING',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  RELATIONSHIP_DYNAMICS = 'RELATIONSHIP_DYNAMICS',
}

// ================================
// СТРУКТУРЫ ДАННЫХ
// ================================

export interface WisdomNugget {
  id: string
  type: WisdomType
  source: WisdomSource
  content: string
  context: string
  applicability: string
  depth_level: number // 1-10
  universality: number // 1-10
  emotional_impact: number // 1-10
}

export interface WisdomPattern {
  pattern_name: string
  pattern_description: string
  common_themes: string[]
  typical_characters: string[]
  story_structure: string
  wisdom_types: WisdomType[]
  cultural_contexts: string[]
}

// ================================
// ЭКСТРАКТОР МУДРОСТИ
// ================================

export class WisdomExtractor {
  /**
   * 💎 Извлекает мудрость из полной истории
   */
  static extractWisdom(params: {
    story: WovenStory
    characters: CharacterProfile[]
    themes: Theme[]
    writer_style: WriterStyle
    genre: StoryGenre
  }): WisdomExtraction {
    // 1. Анализируем трансформации персонажей
    const characterWisdom = this.extractCharacterWisdom(
      params.characters,
      params.story
    )

    // 2. Анализируем разрешение конфликтов
    const conflictWisdom = this.extractConflictWisdom(
      params.story,
      params.themes
    )

    // 3. Анализируем тематические элементы
    const thematicWisdom = this.extractThematicWisdom(
      params.themes,
      params.writer_style
    )

    // 4. Анализируем символические связи
    const symbolicWisdom = this.extractSymbolicWisdom(params.story.symbols)

    // 5. Синтезируем общую мудрость
    const synthesizedWisdom = this.synthesizeWisdom(
      [
        ...characterWisdom,
        ...conflictWisdom,
        ...thematicWisdom,
        ...symbolicWisdom,
      ],
      params.writer_style,
      params.genre
    )

    return synthesizedWisdom
  }

  /**
   * 🎭 Извлекает мудрость из трансформаций персонажей
   */
  private static extractCharacterWisdom(
    characters: CharacterProfile[],
    story: WovenStory
  ): WisdomNugget[] {
    const wisdom: WisdomNugget[] = []

    characters.forEach((character, index) => {
      const thread = story.threads.find(t => t.protagonist === character.id)
      if (!thread) return

      // Мудрость из преодоления основного страха
      if (character.psychology.core_fear) {
        wisdom.push({
          id: `character_fear_${index}`,
          type: WisdomType.MORAL_LESSON,
          source: WisdomSource.CHARACTER_TRANSFORMATION,
          content: this.generateFearWisdom(character.psychology.core_fear),
          context: `${character.name}'s journey of overcoming fear`,
          applicability: 'Anyone struggling with similar fears',
          depth_level: 8,
          universality: 9,
          emotional_impact: 8,
        })
      }

      // Мудрость из принятия истины
      if (character.psychology.truth_needed) {
        wisdom.push({
          id: `character_truth_${index}`,
          type: WisdomType.UNIVERSAL_TRUTH,
          source: WisdomSource.CHARACTER_TRANSFORMATION,
          content: character.psychology.truth_needed,
          context: `The truth ${character.name} needed to learn`,
          applicability: 'Universal human experience',
          depth_level: 9,
          universality: 10,
          emotional_impact: 9,
        })
      }

      // Мудрость из разрешения внутреннего конфликта
      if (character.psychology.internal_conflict) {
        wisdom.push({
          id: `character_conflict_${index}`,
          type: WisdomType.PHILOSOPHICAL_INSIGHT,
          source: WisdomSource.CHARACTER_TRANSFORMATION,
          content: this.generateConflictWisdom(
            character.psychology.internal_conflict
          ),
          context: `${character.name}'s internal struggle`,
          applicability: 'People facing internal contradictions',
          depth_level: 7,
          universality: 8,
          emotional_impact: 7,
        })
      }
    })

    return wisdom
  }

  /**
   * ⚔️ Извлекает мудрость из разрешения конфликтов
   */
  private static extractConflictWisdom(
    story: WovenStory,
    themes: Theme[]
  ): WisdomNugget[] {
    const wisdom: WisdomNugget[] = []

    // Анализируем пересечения как источники мудрости
    story.intersections.forEach((intersection, index) => {
      const wisdomContent = this.generateIntersectionWisdom(intersection)

      if (wisdomContent) {
        wisdom.push({
          id: `intersection_${index}`,
          type: this.determineWisdomTypeFromIntersection(
            intersection.intersection_type
          ),
          source: WisdomSource.CONFLICT_RESOLUTION,
          content: wisdomContent,
          context: intersection.impact_description,
          applicability: 'Situations involving similar conflicts',
          depth_level: intersection.emotional_weight,
          universality: 7,
          emotional_impact: intersection.emotional_weight,
        })
      }
    })

    // Анализируем темы
    themes.forEach((theme, index) => {
      wisdom.push({
        id: `theme_${index}`,
        type: WisdomType.UNIVERSAL_TRUTH,
        source: WisdomSource.THEMATIC_EXPLORATION,
        content: theme.universal_truth,
        context: theme.description,
        applicability: 'Universal human experience',
        depth_level: 9,
        universality: 10,
        emotional_impact: 8,
      })
    })

    return wisdom
  }

  /**
   * 🎨 Извлекает тематическую мудрость
   */
  private static extractThematicWisdom(
    themes: Theme[],
    writerStyle: WriterStyle
  ): WisdomNugget[] {
    const wisdom: WisdomNugget[] = []

    themes.forEach((theme, index) => {
      // Основная мудрость темы
      wisdom.push({
        id: `theme_core_${index}`,
        type: WisdomType.UNIVERSAL_TRUTH,
        source: WisdomSource.THEMATIC_EXPLORATION,
        content: theme.universal_truth,
        context: theme.description,
        applicability: 'All human experience',
        depth_level: 9,
        universality: 10,
        emotional_impact: 8,
      })

      // Мудрость из моральной дилеммы
      if (theme.moral_dilemma) {
        wisdom.push({
          id: `theme_dilemma_${index}`,
          type: WisdomType.PHILOSOPHICAL_INSIGHT,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content: this.generateDilemmaWisdom(theme.moral_dilemma),
          context: theme.moral_dilemma,
          applicability: 'Ethical decision-making situations',
          depth_level: 8,
          universality: 8,
          emotional_impact: 7,
        })
      }
    })

    // Добавляем мудрость специфичную для стиля писателя
    const styleWisdom = this.getWriterStyleWisdom(writerStyle)
    wisdom.push(...styleWisdom)

    return wisdom
  }

  /**
   * 🔮 Извлекает символическую мудрость
   */
  private static extractSymbolicWisdom(symbols: any[]): WisdomNugget[] {
    const wisdom: WisdomNugget[] = []

    symbols.forEach((symbol, index) => {
      wisdom.push({
        id: `symbol_${index}`,
        type: WisdomType.EMOTIONAL_RESONANCE,
        source: WisdomSource.SYMBOLIC_MEANING,
        content: symbol.final_significance,
        context: `Symbolic meaning of ${symbol.symbol}`,
        applicability: 'Metaphorical understanding of life',
        depth_level: 7,
        universality: 6,
        emotional_impact: 8,
      })
    })

    return wisdom
  }

  /**
   * 🧠 Синтезирует мудрость в общую структуру
   */
  private static synthesizeWisdom(
    wisdomNuggets: WisdomNugget[],
    writerStyle: WriterStyle,
    genre: StoryGenre
  ): WisdomExtraction {
    // Находим самые сильные элементы мудрости
    const topWisdom = wisdomNuggets.sort(
      (a, b) =>
        b.depth_level +
        b.universality +
        b.emotional_impact -
        (a.depth_level + a.universality + a.emotional_impact)
    )

    const coreMessage = this.generateCoreMessage(topWisdom, writerStyle)
    const moralLesson = this.generateMoralLesson(topWisdom)
    const philosophicalInsight = this.generatePhilosophicalInsight(
      topWisdom,
      writerStyle
    )
    const practicalWisdom = this.generatePracticalWisdom(topWisdom)
    const universalTruth = this.generateUniversalTruth(topWisdom)
    const emotionalResonance = this.generateEmotionalResonance(topWisdom)
    const callToAction = this.generateCallToAction(topWisdom, writerStyle)

    return {
      core_message: coreMessage,
      moral_lesson: moralLesson,
      philosophical_insight: philosophicalInsight,
      practical_wisdom: practicalWisdom,
      universal_truth: universalTruth,
      emotional_resonance: emotionalResonance,
      call_to_action: callToAction,
    }
  }

  // ================================
  // ГЕНЕРАТОРЫ МУДРОСТИ
  // ================================

  /**
   * 😨 Генерирует мудрость из преодоления страха
   */
  private static generateFearWisdom(fear: string): string {
    const fearWisdomTemplates = [
      `The courage to face ${fear} reveals strength we never knew we had`,
      `${fear} loses its power when we stop running from it`,
      `True growth happens when we walk toward what frightens us most`,
      `The fear of ${fear} is often worse than the reality itself`,
      `Overcoming ${fear} opens doors to possibilities we couldn't imagine`,
    ]

    return fearWisdomTemplates[
      Math.floor(Math.random() * fearWisdomTemplates.length)
    ]
  }

  /**
   * ⚔️ Генерирует мудрость из внутреннего конфликта
   */
  private static generateConflictWisdom(conflict: string): string {
    return `The tension between opposing forces within us is not a flaw to fix, but a creative force to harness. ${conflict} teaches us that wholeness comes not from eliminating contradictions, but from integrating them wisely.`
  }

  /**
   * 💭 Генерирует мудрость из моральной дилеммы
   */
  private static generateDilemmaWisdom(dilemma: string): string {
    return `When faced with ${dilemma}, the path forward isn't found in choosing sides, but in transcending the limitation of either/or thinking to discover a third way that honors the truth in both perspectives.`
  }

  /**
   * ✍️ Получает мудрость специфичную для стиля писателя
   */
  private static getWriterStyleWisdom(style: WriterStyle): WisdomNugget[] {
    const styleWisdom: Record<WriterStyle, WisdomNugget[]> = {
      [WriterStyle.STEPHEN_KING]: [
        {
          id: 'king_horror_wisdom',
          type: WisdomType.MORAL_LESSON,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'The real monsters are often the ones we create through our own cruelty and indifference',
          context: 'Horror as metaphor for human nature',
          applicability:
            'Understanding the darkness within ourselves and society',
          depth_level: 9,
          universality: 8,
          emotional_impact: 9,
        },
      ],

      [WriterStyle.MARGARET_ATWOOD]: [
        {
          id: 'atwood_dystopia_wisdom',
          type: WisdomType.PHILOSOPHICAL_INSIGHT,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'The seeds of dystopia are planted in the soil of our present complacency',
          context: 'Warning about societal trends',
          applicability: 'Active citizenship and social responsibility',
          depth_level: 10,
          universality: 9,
          emotional_impact: 8,
        },
      ],

      [WriterStyle.NEIL_GAIMAN]: [
        {
          id: 'gaiman_myth_wisdom',
          type: WisdomType.SPIRITUAL_AWAKENING,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'Stories are the bridges that connect us to the eternal truths that transcend time and culture',
          context: 'The power of narrative and myth',
          applicability: 'Finding meaning through storytelling',
          depth_level: 9,
          universality: 10,
          emotional_impact: 9,
        },
      ],

      [WriterStyle.HARUKI_MURAKAMI]: [
        {
          id: 'murakami_alienation_wisdom',
          type: WisdomType.EMOTIONAL_RESONANCE,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'In a world of endless connections, the deepest intimacy comes from truly being present with another person',
          context: 'Modern alienation and authentic connection',
          applicability: 'Building meaningful relationships in digital age',
          depth_level: 8,
          universality: 9,
          emotional_impact: 9,
        },
      ],

      [WriterStyle.BIBLICAL]: [
        {
          id: 'biblical_redemption_wisdom',
          type: WisdomType.SPIRITUAL_AWAKENING,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'Every fall contains the seed of redemption, every ending the promise of new beginning',
          context: 'Spiritual transformation through trial',
          applicability: 'Finding hope in difficult circumstances',
          depth_level: 10,
          universality: 10,
          emotional_impact: 10,
        },
      ],

      // Добавляем остальные стили...
      [WriterStyle.GEORGE_RR_MARTIN]: [
        {
          id: 'martin_power_wisdom',
          type: WisdomType.MORAL_LESSON,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'Power corrupts not because it is inherently evil, but because it isolates us from the humanity of others',
          context: 'Politics and moral complexity',
          applicability: 'Leadership and ethical decision-making',
          depth_level: 9,
          universality: 8,
          emotional_impact: 7,
        },
      ],

      [WriterStyle.TONI_MORRISON]: [
        {
          id: 'morrison_trauma_wisdom',
          type: WisdomType.EMOTIONAL_RESONANCE,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'Healing happens not by forgetting our wounds, but by transforming them into sources of strength and compassion',
          context: 'Trauma and recovery',
          applicability: 'Personal healing and resilience',
          depth_level: 10,
          universality: 9,
          emotional_impact: 10,
        },
      ],

      [WriterStyle.URSULA_LE_GUIN]: [
        {
          id: 'leguin_balance_wisdom',
          type: WisdomType.PHILOSOPHICAL_INSIGHT,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'True wisdom lies not in conquering nature or others, but in understanding our place in the greater web of existence',
          context: 'Ecological and philosophical balance',
          applicability: 'Environmental consciousness and ethical living',
          depth_level: 10,
          universality: 9,
          emotional_impact: 8,
        },
      ],

      [WriterStyle.GABRIEL_MARQUEZ]: [
        {
          id: 'marquez_reality_wisdom',
          type: WisdomType.UNIVERSAL_TRUTH,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'Reality is far more magical than we imagine, and magic far more real than we believe',
          context: 'Magical realism and wonder',
          applicability: 'Maintaining wonder and openness to mystery',
          depth_level: 8,
          universality: 8,
          emotional_impact: 9,
        },
      ],

      [WriterStyle.RUSSIAN_CLASSICS]: [
        {
          id: 'russian_soul_wisdom',
          type: WisdomType.SPIRITUAL_AWAKENING,
          source: WisdomSource.THEMATIC_EXPLORATION,
          content:
            'The human soul is vast enough to contain both terrible suffering and transcendent joy, and it is in this vastness that we find our divinity',
          context: 'Depth of human experience',
          applicability: 'Embracing the full spectrum of human emotion',
          depth_level: 10,
          universality: 10,
          emotional_impact: 10,
        },
      ],
    }

    return styleWisdom[style] || []
  }

  /**
   * 💫 Генерирует основную мудрость истории
   */
  private static generateCoreMessage(
    wisdomNuggets: WisdomNugget[],
    style: WriterStyle
  ): string {
    const topNugget = wisdomNuggets[0]
    if (!topNugget)
      return 'Every story teaches us something about the human condition'

    const styleModifiers = {
      [WriterStyle.BIBLICAL]: 'In the sacred tapestry of existence, ',
      [WriterStyle.STEPHEN_KING]: 'In the shadows of the human heart, ',
      [WriterStyle.NEIL_GAIMAN]: 'In the mythic depths of story, ',
      [WriterStyle.HARUKI_MURAKAMI]:
        'In the quiet spaces between reality and dream, ',
      [WriterStyle.MARGARET_ATWOOD]: 'In the mirror of our possible futures, ',
    }

    const modifier = styleModifiers[style] || 'In the journey of this story, '
    return modifier + topNugget.content.toLowerCase()
  }

  /**
   * 📖 Генерирует моральный урок
   */
  private static generateMoralLesson(wisdomNuggets: WisdomNugget[]): string {
    const moralNuggets = wisdomNuggets.filter(
      n => n.type === WisdomType.MORAL_LESSON
    )
    return (
      moralNuggets[0]?.content ||
      'True strength comes from understanding ourselves and others with compassion'
    )
  }

  /**
   * 🧠 Генерирует философский инсайт
   */
  private static generatePhilosophicalInsight(
    wisdomNuggets: WisdomNugget[],
    style: WriterStyle
  ): string {
    const philosophicalNuggets = wisdomNuggets.filter(
      n => n.type === WisdomType.PHILOSOPHICAL_INSIGHT
    )
    return (
      philosophicalNuggets[0]?.content ||
      'The questions we ask shape the reality we experience'
    )
  }

  /**
   * 🛠️ Генерирует практическую мудрость
   */
  private static generatePracticalWisdom(
    wisdomNuggets: WisdomNugget[]
  ): string {
    const practicalNuggets = wisdomNuggets.filter(
      n => n.type === WisdomType.PRACTICAL_WISDOM
    )
    if (practicalNuggets.length > 0) return practicalNuggets[0].content

    // Генерируем практическую мудрость из других типов
    const topNugget = wisdomNuggets[0]
    if (topNugget) {
      return `Apply this wisdom by: reflecting on how ${topNugget.content.toLowerCase()} manifests in your own life and relationships`
    }

    return 'Practice conscious awareness of your thoughts, feelings, and actions in daily life'
  }

  /**
   * 🌟 Генерирует универсальную истину
   */
  private static generateUniversalTruth(wisdomNuggets: WisdomNugget[]): string {
    const universalNuggets = wisdomNuggets.filter(
      n => n.type === WisdomType.UNIVERSAL_TRUTH
    )
    return (
      universalNuggets[0]?.content ||
      'We are all connected in the great web of human experience, learning and growing together'
    )
  }

  /**
   * 💖 Генерирует эмоциональный резонанс
   */
  private static generateEmotionalResonance(
    wisdomNuggets: WisdomNugget[]
  ): string {
    const emotionalNuggets = wisdomNuggets.filter(
      n => n.type === WisdomType.EMOTIONAL_RESONANCE
    )
    return (
      emotionalNuggets[0]?.content ||
      'This story touches the deep places in our hearts where we recognize our shared humanity'
    )
  }

  /**
   * 📢 Генерирует призыв к действию
   */
  private static generateCallToAction(
    wisdomNuggets: WisdomNugget[],
    style: WriterStyle
  ): string {
    const actionTemplates = {
      [WriterStyle.STEPHEN_KING]:
        'Face your fears with courage, knowing that the real monsters are the ones we create through indifference',
      [WriterStyle.MARGARET_ATWOOD]:
        'Stay vigilant against injustice and speak truth to power, for silence is complicity',
      [WriterStyle.NEIL_GAIMAN]:
        'Keep the stories alive, for they are the bridges between worlds and the keys to understanding',
      [WriterStyle.BIBLICAL]:
        'Walk in love and truth, serving others as expressions of the divine within us all',
      [WriterStyle.HARUKI_MURAKAMI]:
        'Embrace the mystery of existence while staying connected to what makes us human',
      [WriterStyle.RUSSIAN_CLASSICS]:
        'Live with the full intensity of human emotion, for in our depths we touch the eternal',
    }

    return (
      actionTemplates[style] ||
      'Take this wisdom into the world and let it guide your choices toward greater compassion and understanding'
    )
  }

  // Вспомогательные методы
  private static generateIntersectionWisdom(intersection: any): string | null {
    const wisdomMap = {
      CONFLICT: 'Conflict reveals character and creates opportunity for growth',
      ALLIANCE: 'Unity in purpose multiplies our individual strengths',
      REVELATION:
        'Truth has the power to transform everything we thought we knew',
      TRANSFORMATION: 'Change is the only constant, and adaptation is survival',
      SACRIFICE:
        'Sometimes the greatest love is expressed through willing sacrifice',
      BETRAYAL: 'Betrayal teaches us the true value of trust and loyalty',
      RECOGNITION:
        'Understanding leads to forgiveness, and forgiveness to peace',
    }

    return (
      wisdomMap[intersection.intersection_type as keyof typeof wisdomMap] ||
      null
    )
  }

  private static determineWisdomTypeFromIntersection(
    intersectionType: string
  ): WisdomType {
    const typeMap = {
      CONFLICT: WisdomType.MORAL_LESSON,
      ALLIANCE: WisdomType.PRACTICAL_WISDOM,
      REVELATION: WisdomType.UNIVERSAL_TRUTH,
      TRANSFORMATION: WisdomType.PHILOSOPHICAL_INSIGHT,
      SACRIFICE: WisdomType.SPIRITUAL_AWAKENING,
      BETRAYAL: WisdomType.MORAL_LESSON,
      RECOGNITION: WisdomType.EMOTIONAL_RESONANCE,
    }

    return (
      typeMap[intersectionType as keyof typeof typeMap] ||
      WisdomType.MORAL_LESSON
    )
  }
}
