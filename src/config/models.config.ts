// models.config.ts
type VideoModelConfig = {
  id: string
  title: string
  description: string
  inputType: ('text' | 'image')[]
  basePrice?: number // Base price in dollars (опционально для динамических моделей)
  pricePerSecond?: number // Цена за секунду для динамического расчёта
  supportedDurations?: number[] // Поддерживаемые длительности в секундах
  defaultDuration?: number // Длительность по умолчанию
  api: {
    model: string
    input: Record<string, any>
  }
  requirements?: {
    minBalance?: number
    maxDuration?: number
  }
  imageKey?: string
}

export const VIDEO_MODELS_CONFIG: Record<string, VideoModelConfig> = {
  minimax: {
    id: 'minimax',
    title: 'Minimax',
    inputType: ['text', 'image'],
    description: 'Базовая модель для начального уровня',
    basePrice: 0.5,
    api: {
      model: 'minimax/video-01',
      input: {
        prompt_optimizer: true,
      },
    },
    imageKey: 'first_frame_image',
  },
  'haiper-video-2': {
    id: 'haiper-video-2',
    title: 'Haiper Video 2',
    description: 'Высокое качество, длительность 6 секунд',
    inputType: ['text', 'image'],
    basePrice: 0.05,
    api: {
      model: 'haiper-ai/haiper-video-2',
      input: {
        duration: 6,
        aspect_ratio: (userAspect: string) =>
          userAspect === '9:16' ? '9:16' : '16:9',
        use_prompt_enhancer: true,
      },
    },
    imageKey: 'frame_image_url',
  },
  'ray-v2': {
    id: 'ray-v2',
    title: 'Ray-v2',
    description: 'Продвинутая модель для детальной анимации',
    inputType: ['text', 'image'],
    basePrice: 0.18,
    api: {
      model: 'luma/ray-2-720p',
      input: {},
    },
    imageKey: 'start_image_url',
  },
  'wan-image-to-video': {
    id: 'wan-image-to-video',
    title: 'Wan-2.1-i2v',
    inputType: ['image'],
    description: 'Базовая модель для начального уровня',
    basePrice: 0.25,
    api: {
      model: 'wavespeedai/wan-2.1-i2v-720p',
      input: {
        fast_mode: 'Balanced',
        num_frames: 81,
        sample_shift: 5,
        sample_steps: 30,
        frames_per_second: 16,
        sample_guide_scale: 5,
        max_area: '720x1280',
      },
    },
    imageKey: 'image',
  },
  'wan-text-to-video': {
    id: 'wan-text-to-video',
    title: 'Wan-2.1',
    inputType: ['text'],
    description: 'Базовая модель для начального уровня',
    basePrice: 0.25,
    api: {
      model: 'wavespeedai/wan-2.1-t2v-720p',
      input: {
        fast_mode: 'Balanced',
        num_frames: 81,
        sample_shift: 5,
        sample_steps: 30,
        frames_per_second: 16,
        sample_guide_scale: 5,
        max_area: '720x1280',
      },
    },
  },
  'kling-v1.6-pro': {
    id: 'kling-v1.6-pro',
    title: 'Kling v1.6 Pro',
    inputType: ['text', 'image'],
    description: 'Продвинутая анимация с оптимизацией промптов',
    basePrice: 0.098,
    api: {
      model: 'kwaivgi/kling-v1.6-pro',
      input: {
        prompt_optimizer: true,
        cfg_scale: 0.5,
      },
    },
    imageKey: 'start_image',
  },
  'hunyuan-video-fast': {
    id: 'hunyuan-video-fast',
    title: 'Hunyuan Video Fast',
    inputType: ['text'],
    description: 'Быстрая анимация с оптимизацией промптов',
    basePrice: 0.2,
    api: {
      model: 'wavespeedai/hunyuan-video-fast',
      input: {
        prompt_optimizer: true,
      },
    },
  },
  'veo-3': {
    id: 'veo-3',
    title: 'Google Veo 3',
    inputType: ['text', 'image'],
    description:
      '✅ Премиум качество через Kie.ai (конкурентная цена!), 2-8 сек',
    pricePerSecond: 0.404, // 202⭐ за 8 сек = $3.232 за 8 сек = $0.404/сек (конкурентно с +8.1% наценкой)
    supportedDurations: [2, 4, 6, 8], // Поддерживаемые длительности
    defaultDuration: 8, // По умолчанию 8 секунд
    api: {
      model: 'veo3',
      input: {
        type: 'kie-ai',
        resolution: '1080p', // Kie.ai поддерживает 1080p
      },
    },
    requirements: {
      maxDuration: 8,
    },
    imageKey: 'imageUrl',
  },
  'veo-3-fast': {
    id: 'veo-3-fast',
    title: 'Google Veo 3 Fast',
    inputType: ['text', 'image'],
    description:
      '⚡ Супер быстрая генерация через Kie.ai (конкурентная цена!), 2-8 сек',
    pricePerSecond: 0.08, // 40⭐ за 8 сек = $0.64 за 8 сек = $0.08/сек (конкурентно с +8.1% наценкой)
    supportedDurations: [2, 4, 6, 8, 10], // Поддерживаемые длительности
    defaultDuration: 8, // По умолчанию 8 секунд
    api: {
      model: 'veo3_fast',
      input: {
        type: 'kie-ai',
        resolution: '720p',
        fast_mode: true,
      },
    },
    requirements: {
      maxDuration: 10,
    },
    imageKey: 'imageUrl',
  },
  'runway-aleph': {
    id: 'runway-aleph',
    title: 'Runway Aleph',
    inputType: ['text', 'image'],
    description:
      '🎬 Продвинутое редактирование через Kie.ai (конкурентная цена!)',
    pricePerSecond: 0.485, // 182⭐ за 6 сек = $2.912 за 6 сек = $0.485/сек (конкурентно с +8.1% наценкой)
    supportedDurations: [2, 4, 6, 8, 10], // Поддерживаемые длительности
    defaultDuration: 6, // По умолчанию 6 секунд
    api: {
      model: 'runway-aleph',
      input: {
        type: 'kie-ai',
        resolution: '1080p',
        features: [
          'object-manipulation',
          'relighting',
          'camera-control',
          'style-transfer',
        ],
      },
    },
    requirements: {
      maxDuration: 10,
    },
    imageKey: 'imageUrl',
  },
  'veo-2': {
    id: 'veo-2',
    title: 'Google Veo 2',
    inputType: ['text', 'image'],
    description: 'Стабильная версия Veo, 4-10 сек',
    pricePerSecond: 0.3, // $0.30 за секунду
    supportedDurations: [4, 6, 8, 10], // Поддерживаемые длительности
    defaultDuration: 8, // По умолчанию 8 секунд
    api: {
      model: 'veo-2.0-generate-001',
      input: {
        type: 'vertex-ai',
      },
    },
    requirements: {
      maxDuration: 10,
    },
    imageKey: 'imageUrl',
  },
}
