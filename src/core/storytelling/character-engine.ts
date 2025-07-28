/**
 * 🎭 Движок Персонажей - Создатель Живых Душ
 *
 * Система для создания многослойных персонажей с глубокой психологией,
 * основанная на работах Кристофера Воглера, Джозефа Кэмпбелла и современной
 * психологии персонажей.
 */

import {
  CharacterProfile,
  CharacterPsychology,
  CharacterRelationship,
  CharacterArcType,
  WriterStyle,
  StoryGenre,
} from '@/interfaces/story-architecture.interface'

// ================================
// АРХЕТИПЫ ПЕРСОНАЖЕЙ (КЭМПБЕЛЛ/ВОГЛЕР)
// ================================

export enum CharacterArchetype {
  HERO = 'HERO', // Герой - центр истории
  MENTOR = 'MENTOR', // Наставник - дает мудрость
  THRESHOLD_GUARDIAN = 'THRESHOLD_GUARDIAN', // Страж порога - первое препятствие
  HERALD = 'HERALD', // Вестник - приносит вызов
  SHAPESHIFTER = 'SHAPESHIFTER', // Оборотень - изменчивый союзник/враг
  SHADOW = 'SHADOW', // Тень - главный антагонист
  ALLY = 'ALLY', // Союзник - поддерживает героя
  TRICKSTER = 'TRICKSTER', // Трикстер - комическое облегчение/мудрость
}

// ================================
// ПСИХОЛОГИЧЕСКИЕ ТИПЫ (16 PERSONALITIES)
// ================================

export enum PersonalityType {
  // Аналитики
  ARCHITECT = 'INTJ', // Архитектор - стратегический мыслитель
  LOGICIAN = 'INTP', // Логик - инновационный изобретатель
  COMMANDER = 'ENTJ', // Командир - смелый лидер
  DEBATER = 'ENTP', // Полемист - умный и любопытный мыслитель

  // Дипломаты
  ADVOCATE = 'INFJ', // Активист - тихий и мистический идеалист
  MEDIATOR = 'INFP', // Посредник - поэтичный и добрый альтруист
  PROTAGONIST = 'ENFJ', // Тренер - харизматичный и вдохновляющий лидер
  CAMPAIGNER = 'ENFP', // Борец - восторженный и творческий

  // Хранители
  LOGISTICIAN = 'ISTJ', // Администратор - практичный и ответственный
  DEFENDER = 'ISFJ', // Защитник - очень преданный и теплосердечный
  EXECUTIVE = 'ESTJ', // Менеджер - отличный администратор
  CONSUL = 'ESFJ', // Консул - экстравертированный и заботливый

  // Искатели
  VIRTUOSO = 'ISTP', // Виртуоз - смелый и практичный экспериментатор
  ADVENTURER = 'ISFP', // Артист - гибкий и очаровательный художник
  ENTREPRENEUR = 'ESTP', // Делец - умный и энергичный
  ENTERTAINER = 'ESFP', // Развлекатель - спонтанный и восторженный
}

// ================================
// ДВИЖОК ПЕРСОНАЖЕЙ
// ================================

export class CharacterEngine {
  /**
   * 🎭 Создает персонажа на основе роли в истории и стиля писателя
   */
  static generateCharacter(params: {
    name: string
    archetype: CharacterArchetype
    writerStyle: WriterStyle
    genre: StoryGenre
    personalityType?: PersonalityType
    themeToEmbody: string
    relationshipToProtagonist?: string
  }): CharacterProfile {
    const psychology = this.generatePsychology(params)
    const arcType = this.determineArcType(params.archetype)
    const relationships = this.generateBaseRelationships(params)

    return {
      id: this.generateId(params.name),
      name: params.name,
      role: this.mapArchetypeToRole(params.archetype),
      psychology,
      arc_type: arcType,
      backstory: this.generateBackstory(params, psychology),
      motivation: psychology.core_need,
      quirks: this.generateQuirks(params),
      speech_pattern: this.generateSpeechPattern(params),
      internal_monologue_style: this.generateInternalMonologue(params),
      relationships,
      theme_embodiment: params.themeToEmbody,
    }
  }

  /**
   * 🧠 Генерирует глубокую психологию персонажа
   */
  private static generatePsychology(params: {
    archetype: CharacterArchetype
    writerStyle: WriterStyle
    personalityType?: PersonalityType
  }): CharacterPsychology {
    const archetypeTraits = this.getArchetypeTraits(params.archetype)
    const writerStyleTraits = this.getWriterStyleTraits(params.writerStyle)
    const personalityTraits = params.personalityType
      ? this.getPersonalityTraits(params.personalityType)
      : null

    return {
      core_wound: this.generateCoreWound(archetypeTraits, writerStyleTraits),
      core_need: this.generateCoreNeed(archetypeTraits),
      core_fear: this.generateCoreFear(archetypeTraits),
      theory_of_control: this.generateTheoryOfControl(
        archetypeTraits,
        personalityTraits
      ),
      ghost: this.generateGhost(archetypeTraits, writerStyleTraits),
      lie_believed: this.generateLieBelieved(archetypeTraits),
      truth_needed: this.generateTruthNeeded(archetypeTraits),
      internal_conflict: this.generateInternalConflict(archetypeTraits),
      external_conflict: this.generateExternalConflict(archetypeTraits),
      philosophical_conflict: this.generatePhilosophicalConflict(
        archetypeTraits,
        writerStyleTraits
      ),
    }
  }

  /**
   * 🏛️ Получает черты архетипа
   */
  private static getArchetypeTraits(archetype: CharacterArchetype) {
    const traits = {
      [CharacterArchetype.HERO]: {
        strengths: [
          'courage',
          'determination',
          'growth-oriented',
          'empathetic',
        ],
        weaknesses: ['naive', 'self-doubting', 'impulsive', 'burdened'],
        motivation: 'To prove themselves and protect others',
        fear: 'Inadequacy and failing those they care about',
        wound: 'Abandonment or betrayal in formative years',
        need: 'To find inner strength and self-worth',
        lie: 'I am not enough as I am',
        truth: 'True strength comes from within and connection to others',
      },

      [CharacterArchetype.MENTOR]: {
        strengths: ['wise', 'experienced', 'nurturing', 'insightful'],
        weaknesses: ['controlling', 'secretive', 'living-in-past', 'martyrdom'],
        motivation: 'To guide and protect the next generation',
        fear: 'Their knowledge dying with them',
        wound: 'Failed to save someone important',
        need: 'To pass on their legacy meaningfully',
        lie: 'I must control outcomes to prevent tragedy',
        truth: 'Wisdom is given freely, growth must be earned',
      },

      [CharacterArchetype.SHADOW]: {
        strengths: ['powerful', 'charismatic', 'driven', 'intelligent'],
        weaknesses: ['narcissistic', 'cruel', 'obsessed', 'isolated'],
        motivation: 'To gain control and avoid vulnerability',
        fear: 'Powerlessness and irrelevance',
        wound: 'Humiliation or abandonment',
        need: 'To be seen and accepted',
        lie: 'Power is the only thing that matters',
        truth: 'True power comes from connection and service',
      },

      [CharacterArchetype.SHAPESHIFTER]: {
        strengths: ['adaptable', 'charismatic', 'mysterious', 'complex'],
        weaknesses: ['duplicitous', 'unreliable', 'conflicted', 'manipulative'],
        motivation: 'To survive and protect their true self',
        fear: 'Being truly known and rejected',
        wound: 'Forced to hide their true nature',
        need: 'To be accepted for who they really are',
        lie: 'I must be what others want me to be',
        truth: 'Authenticity is worth the risk of rejection',
      },

      [CharacterArchetype.ALLY]: {
        strengths: ['loyal', 'supportive', 'skilled', 'reliable'],
        weaknesses: [
          'self-sacrificing',
          'dependent',
          'secondary',
          'conflicted',
        ],
        motivation: 'To support and be valued by the hero',
        fear: 'Being left behind or forgotten',
        wound: 'Being overlooked or undervalued',
        need: 'To be seen as an equal',
        lie: 'My worth comes from serving others',
        truth: 'I have value independent of others',
      },

      [CharacterArchetype.TRICKSTER]: {
        strengths: ['humorous', 'wise', 'flexible', 'honest'],
        weaknesses: ['chaotic', 'irresponsible', 'avoiding-depth', 'defensive'],
        motivation: 'To expose truth through humor and chaos',
        fear: 'Being taken too seriously or being rejected',
        wound: 'Trauma masked by humor',
        need: 'To be valued for their authentic self',
        lie: "If I keep people laughing, they won't see my pain",
        truth: 'Vulnerability and humor can coexist',
      },
    }

    return traits[archetype] || traits[CharacterArchetype.HERO]
  }

  /**
   * ✍️ Получает особенности стиля писателя для персонажей
   */
  private static getWriterStyleTraits(style: WriterStyle) {
    const styleTraits = {
      [WriterStyle.STEPHEN_KING]: {
        wounds: [
          'childhood_trauma',
          'small_town_secrets',
          'psychological_abuse',
          'supernatural_encounter',
        ],
        conflicts: [
          'ordinary_vs_extraordinary',
          'sanity_vs_madness',
          'good_vs_evil',
          'past_vs_present',
        ],
        speech: 'colloquial_american_midwest',
        psychology: 'deep_fear_based_motivation',
      },

      [WriterStyle.MARGARET_ATWOOD]: {
        wounds: [
          'systemic_oppression',
          'lost_autonomy',
          'environmental_destruction',
          'betrayal_by_system',
        ],
        conflicts: [
          'individual_vs_system',
          'freedom_vs_security',
          'nature_vs_technology',
          'truth_vs_propaganda',
        ],
        speech: 'precise_intellectual_sometimes_clinical',
        psychology: 'survival_through_adaptation',
      },

      [WriterStyle.NEIL_GAIMAN]: {
        wounds: [
          'loss_of_wonder',
          'forgotten_magic',
          'broken_stories',
          'severed_connections',
        ],
        conflicts: [
          'myth_vs_reality',
          'childhood_vs_adulthood',
          'dream_vs_waking',
          'old_gods_vs_new',
        ],
        speech: 'poetic_mysterious_layered_meaning',
        psychology: 'seeking_lost_wholeness',
      },

      [WriterStyle.HARUKI_MURAKAMI]: {
        wounds: [
          'modern_alienation',
          'lost_love',
          'identity_fragmentation',
          'disconnection',
        ],
        conflicts: [
          'reality_vs_surreal',
          'connection_vs_isolation',
          'memory_vs_forgetting',
          'ordinary_vs_magical',
        ],
        speech: 'simple_hypnotic_repetitive',
        psychology: 'searching_for_meaning_in_absurdity',
      },

      [WriterStyle.BIBLICAL]: {
        wounds: [
          'spiritual_separation',
          'moral_failure',
          'pride_and_fall',
          'testing_of_faith',
        ],
        conflicts: [
          'flesh_vs_spirit',
          'obedience_vs_rebellion',
          'justice_vs_mercy',
          'temporal_vs_eternal',
        ],
        speech: 'formal_poetic_metaphorical',
        psychology: 'redemption_through_transformation',
      },
    }

    return styleTraits[style] || styleTraits[WriterStyle.STEPHEN_KING]
  }

  /**
   * 🧩 Генерирует основную рану персонажа
   */
  private static generateCoreWound(
    archetypeTraits: any,
    styleTraits: any
  ): string {
    const possibleWounds = [
      archetypeTraits.wound,
      ...styleTraits.wounds.map((w: string) => this.woundTemplates[w] || w),
    ]

    return possibleWounds[Math.floor(Math.random() * possibleWounds.length)]
  }

  /**
   * 💔 Шаблоны ран для разных контекстов
   */
  private static woundTemplates: Record<string, string> = {
    childhood_trauma:
      'Witnessed or experienced violence as a child that shattered their sense of safety',
    small_town_secrets:
      'Discovered a dark truth about their community that everyone else ignores',
    psychological_abuse:
      'Systematically told they were worthless by someone they trusted',
    supernatural_encounter:
      'Experienced something impossible that no one believes',
    systemic_oppression:
      'Had their voice and agency systematically stripped away by institutions',
    lost_autonomy: 'Forced to give up their dreams and identity for survival',
    environmental_destruction:
      'Watched their natural world destroyed by progress',
    betrayal_by_system:
      'Trusted in justice/democracy/religion only to be betrayed',
    loss_of_wonder: 'Had their childlike amazement crushed by harsh reality',
    forgotten_magic:
      'Lost connection to something mystical they once believed in',
    broken_stories:
      'Learned that the stories that gave their life meaning were lies',
    severed_connections: 'Lost someone who made them feel whole',
    modern_alienation:
      'Feels disconnected from authentic human connection in digital age',
    lost_love:
      'Had their heart broken in a way that changed how they see relationships',
    identity_fragmentation: 'Feels like they are multiple incompatible people',
    spiritual_separation: 'Feels abandoned by divine/cosmic order',
    moral_failure: 'Made a choice that compromised their core values',
    pride_and_fall: 'Their hubris led to destruction of something precious',
    testing_of_faith: 'Had their deepest beliefs challenged by suffering',
  }

  /**
   * 🎯 Создает теорию контроля персонажа
   */
  private static generateTheoryOfControl(
    archetypeTraits: any,
    personalityTraits: any
  ): string {
    const controlStrategies = [
      'If I am perfect, no one can reject me',
      'If I help everyone, I will be indispensable',
      'If I control information, I control outcomes',
      'If I never get attached, I cannot be hurt',
      'If I am strong enough, I can protect everyone',
      'If I stay invisible, I will be safe',
      'If I make people laugh, they will love me',
      'If I anticipate every problem, nothing bad will happen',
    ]

    return controlStrategies[
      Math.floor(Math.random() * controlStrategies.length)
    ]
  }

  /**
   * 🎨 Генерирует уникальные особенности персонажа
   */
  private static generateQuirks(params: any): string[] {
    const quirkSets = {
      [WriterStyle.STEPHEN_KING]: [
        'Talks to themselves when nervous',
        'Collects vintage horror movie posters',
        'Always carries a lucky charm',
        'Refuses to sleep without checking locks twice',
      ],
      [WriterStyle.NEIL_GAIMAN]: [
        'Reads tarot cards for strangers',
        'Speaks to cats as if they understand',
        'Collects stories from old graveyards',
        'Wears mismatched socks on purpose',
      ],
      [WriterStyle.HARUKI_MURAKAMI]: [
        'Makes perfect coffee every morning',
        'Listens to jazz while doing mundane tasks',
        'Counts steps when walking',
        "Remembers everyone's birthday but forgets their own",
      ],
    }

    const defaultQuirks = [
      'Has an unusual hobby',
      'Uses specific phrases repeatedly',
      'Has a ritual for stressful situations',
      'Notices details others miss',
    ]

    const relevantQuirks = quirkSets[params.writerStyle] || defaultQuirks
    return relevantQuirks.slice(0, 2)
  }

  /**
   * 💬 Генерирует манеру речи
   */
  private static generateSpeechPattern(params: any): string {
    const patterns = {
      [CharacterArchetype.HERO]:
        'Direct, earnest, sometimes uncertain, uses "I think" and "maybe"',
      [CharacterArchetype.MENTOR]:
        'Measured, metaphorical, asks leading questions, uses parables',
      [CharacterArchetype.SHADOW]:
        "Commanding, manipulative, uses people's names for control",
      [CharacterArchetype.TRICKSTER]:
        'Rapid-fire, wordplay, interrupts others, deflects with humor',
      [CharacterArchetype.ALLY]:
        'Supportive, practical, references shared experiences',
    }

    return patterns[params.archetype] || patterns[CharacterArchetype.HERO]
  }

  /**
   * 🧠 Генерирует стиль внутреннего монолога
   */
  private static generateInternalMonologue(params: any): string {
    const styles = {
      [WriterStyle.STEPHEN_KING]:
        'Stream-of-consciousness, paranoid undertones, vivid sensory details',
      [WriterStyle.MARGARET_ATWOOD]:
        'Analytical, political awareness, sharp observations about power',
      [WriterStyle.NEIL_GAIMAN]:
        'Mythic connections, sees symbols everywhere, poetic imagery',
      [WriterStyle.HARUKI_MURAKAMI]:
        'Disconnected observations, random memories, mundane details',
      [WriterStyle.BIBLICAL]:
        'Moral wrestling, references to higher purpose, seeks meaning',
    }

    return (
      styles[params.writerStyle] || 'Clear thoughts with emotional undertones'
    )
  }

  /**
   * 🔗 Создает систему взаимоотношений между персонажами
   */
  static generateCharacterWeb(
    characters: CharacterProfile[]
  ): CharacterRelationship[] {
    const relationships: CharacterRelationship[] = []

    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const char1 = characters[i]
        const char2 = characters[j]

        const relationship = this.generateRelationshipBetween(char1, char2)
        if (relationship) {
          relationships.push(relationship)

          // Создаем обратную связь
          const reverseRelationship = this.createReverseRelationship(
            relationship,
            char1.id,
            char2.id
          )
          relationships.push(reverseRelationship)
        }
      }
    }

    return relationships
  }

  /**
   * 💞 Генерирует отношения между двумя персонажами
   */
  private static generateRelationshipBetween(
    char1: CharacterProfile,
    char2: CharacterProfile
  ): CharacterRelationship | null {
    const relationshipTypes = [
      'LOVE',
      'RIVALRY',
      'MENTORSHIP',
      'FAMILY',
      'FRIENDSHIP',
      'CONFLICT',
    ] as const

    // Логика определения типа отношений на основе архетипов
    let relationshipType: (typeof relationshipTypes)[number]

    if (char1.role === 'PROTAGONIST' && char2.role === 'MENTOR') {
      relationshipType = 'MENTORSHIP'
    } else if (char1.role === 'PROTAGONIST' && char2.role === 'ANTAGONIST') {
      relationshipType = 'CONFLICT'
    } else if (char1.psychology.core_need === char2.psychology.core_need) {
      relationshipType = 'RIVALRY'
    } else if (this.isComplementary(char1.psychology, char2.psychology)) {
      relationshipType = 'FRIENDSHIP'
    } else {
      relationshipType =
        relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)]
    }

    return {
      with_character_id: char2.id,
      relationship_type: relationshipType,
      dynamic: this.generateRelationshipDynamic(char1, char2, relationshipType),
      tension_source: this.generateTensionSource(char1, char2),
      resolution_arc: this.generateResolutionArc(relationshipType),
    }
  }

  /**
   * 🤝 Проверяет, дополняют ли друг друга персонажи
   */
  private static isComplementary(
    psych1: CharacterPsychology,
    psych2: CharacterPsychology
  ): boolean {
    return (
      psych1.core_fear !== psych2.core_fear &&
      psych1.theory_of_control !== psych2.theory_of_control
    )
  }

  // Вспомогательные методы для генерации отношений...
  private static generateRelationshipDynamic(
    char1: CharacterProfile,
    char2: CharacterProfile,
    type: string
  ): string {
    return `${char1.name} and ${
      char2.name
    } create ${type.toLowerCase()} tension through their contrasting approaches to control`
  }

  private static generateTensionSource(
    char1: CharacterProfile,
    char2: CharacterProfile
  ): string {
    return `Conflict between ${char1.psychology.theory_of_control} and ${char2.psychology.theory_of_control}`
  }

  private static generateResolutionArc(type: string): string {
    const resolutions = {
      LOVE: "Through understanding and acceptance of each other's wounds",
      RIVALRY: 'By finding common ground and shared purpose',
      MENTORSHIP: 'When the student surpasses the teacher',
      FAMILY: 'Through forgiveness and healing old wounds',
      FRIENDSHIP: 'By supporting each other through individual growth',
      CONFLICT: 'Through confrontation and mutual transformation',
    }

    return (
      resolutions[type as keyof typeof resolutions] ||
      'Through mutual understanding'
    )
  }

  // Остальные вспомогательные методы...
  private static generateId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_')
  }

  private static mapArchetypeToRole(
    archetype: CharacterArchetype
  ):
    | 'PROTAGONIST'
    | 'ANTAGONIST'
    | 'ALLY'
    | 'MENTOR'
    | 'GUARDIAN'
    | 'TRICKSTER' {
    const mapping = {
      [CharacterArchetype.HERO]: 'PROTAGONIST' as const,
      [CharacterArchetype.SHADOW]: 'ANTAGONIST' as const,
      [CharacterArchetype.MENTOR]: 'MENTOR' as const,
      [CharacterArchetype.ALLY]: 'ALLY' as const,
      [CharacterArchetype.THRESHOLD_GUARDIAN]: 'GUARDIAN' as const,
      [CharacterArchetype.TRICKSTER]: 'TRICKSTER' as const,
      [CharacterArchetype.SHAPESHIFTER]: 'ALLY' as const,
      [CharacterArchetype.HERALD]: 'ALLY' as const,
    }

    return mapping[archetype]
  }

  private static determineArcType(
    archetype: CharacterArchetype
  ): CharacterArcType {
    const arcTypes = {
      [CharacterArchetype.HERO]: {
        positive: true,
        change: true,
        growth: true,
        fall: false,
      },
      [CharacterArchetype.SHADOW]: {
        positive: false,
        change: false,
        growth: false,
        fall: true,
      },
      [CharacterArchetype.MENTOR]: {
        positive: true,
        change: false,
        growth: false,
        fall: false,
      },
      [CharacterArchetype.ALLY]: {
        positive: true,
        change: true,
        growth: true,
        fall: false,
      },
    }

    return (
      arcTypes[archetype] || {
        positive: true,
        change: true,
        growth: true,
        fall: false,
      }
    )
  }

  private static generateBackstory(
    params: any,
    psychology: CharacterPsychology
  ): string {
    return `Shaped by ${psychology.ghost}, this character developed ${psychology.theory_of_control} as their primary coping mechanism.`
  }

  private static generateBaseRelationships(
    params: any
  ): CharacterRelationship[] {
    return [] // Будет заполнено при создании полного веба персонажей
  }

  // Генерация остальных психологических аспектов
  private static generateCoreNeed(traits: any): string {
    return traits.need
  }
  private static generateCoreFear(traits: any): string {
    return traits.fear
  }
  private static generateGhost(traits: any, styleTraits: any): string {
    return traits.wound
  }
  private static generateLieBelieved(traits: any): string {
    return traits.lie
  }
  private static generateTruthNeeded(traits: any): string {
    return traits.truth
  }
  private static generateInternalConflict(traits: any): string {
    return `Torn between ${traits.strengths[0]} and ${traits.weaknesses[0]}`
  }
  private static generateExternalConflict(traits: any): string {
    return `Faces opposition that challenges their ${traits.strengths[0]}`
  }
  private static generatePhilosophicalConflict(
    traits: any,
    styleTraits: any
  ): string {
    return styleTraits.conflicts[0] || 'Good vs Evil'
  }

  private static createReverseRelationship(
    original: CharacterRelationship,
    char1Id: string,
    char2Id: string
  ): CharacterRelationship {
    return {
      ...original,
      with_character_id: char1Id,
    }
  }

  private static getPersonalityTraits(type: PersonalityType) {
    // Возвращает черты личности на основе MBTI типа
    return {
      strengths: [],
      weaknesses: [],
      communication_style: '',
      decision_making: '',
      stress_response: '',
    }
  }
}
