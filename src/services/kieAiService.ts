import axios from 'axios';
import { errorMessage, errorMessageAdmin } from '@/helpers';

/**
 * Сервис для работы с Kie.ai API
 * Документация: https://docs.kie.ai
 * Экономия по сравнению с Vertex AI: до 87%
 */

// Конфигурация моделей Kie.ai (проверенные работающие названия)
interface KieModelConfig {
  name: string;
  description: string;
  pricePerSecond: number;
  maxDuration: number;
  supportedFormats: string[];
  kieModelName: string;
  endpoint: string;
  supportedDurations?: number[];
}

export const KIE_AI_MODELS: Record<string, KieModelConfig> = {
  'veo-3-fast': {
    name: 'Veo 3 Fast',
    description: 'Быстрая генерация',
    pricePerSecond: 0.05, // $0.05/сек (87% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
    kieModelName: 'veo3', // Реальное название в Kie.ai API
    endpoint: '/veo/generate'
  },
  'veo-3': {
    name: 'Veo 3 Quality', 
    description: 'Премиум качество',
    pricePerSecond: 0.25, // $0.25/сек (37% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
    kieModelName: 'veo3', // Реальное название в Kie.ai API
    endpoint: '/veo/generate'
  },
  'runway-gen3': {
    name: 'Runway Gen3',
    description: 'Продвинутая генерация',
    pricePerSecond: 0.30, // $0.30/сек
    maxDuration: 8, // Runway поддерживает только 5 или 8 секунд
    supportedFormats: ['16:9', '9:16', '1:1'],
    kieModelName: 'gen3', // Реальное название в Kie.ai API  
    endpoint: '/runway/generate',
    supportedDurations: [5, 8] // Только эти значения
  }
};

interface KieAiGenerationOptions {
  model: 'veo-3-fast' | 'veo-3' | 'runway-gen3';
  prompt: string;
  duration: number; // 2-10 секунд для Veo, 5 или 8 для Runway
  aspectRatio?: '16:9' | '9:16' | '1:1';
  imageUrl?: string; // для image-to-video
  userId?: string;
  projectId?: number;
}

interface KieAiResponse {
  success: boolean;
  data?: {
    videoUrl: string;
    duration: number;
    taskId?: string;
  };
  cost: {
    usd: number;
    stars: number;
  };
  provider: string;
  model: string;
  processingTime?: number;
  error?: string;
}

export class KieAiService {
  private apiKey: string;
  private baseUrl: string = 'https://api.kie.ai/api/v1';
  
  constructor() {
    this.apiKey = process.env.KIE_AI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ KIE_AI_API_KEY not found. Kie.ai will not be available.');
    }
  }

  /**
   * Проверить доступность API и баланс
   */
  async checkHealth(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Kie.ai API доступен. Кредиты:', response.data.credits);
      return true;
    } catch (error) {
      console.error('❌ Kie.ai API недоступен:', error.message);
      return false;
    }
  }

  /**
   * Получить баланс аккаунта
   */
  async getAccountBalance(): Promise<{ credits: number }> {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return { credits: response.data.credits || 0 };
    } catch (error) {
      console.error('Error getting Kie.ai balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Генерация видео через Kie.ai
   */
  async generateVideo(options: KieAiGenerationOptions): Promise<{
    videoUrl: string;
    cost: number;
    duration: number;
    processingTime: number;
  }> {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required for video generation');
    }

    const {
      model,
      prompt,
      duration,
      aspectRatio = '16:9',
      imageUrl,
      userId,
      projectId
    } = options;

    // Валидация модели
    const modelConfig = KIE_AI_MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${model}`);
    }

    // Валидация длительности для разных моделей
    let clampedDuration: number;
    
    if (modelConfig.supportedDurations) {
      // Для Runway - только поддерживаемые значения
      clampedDuration = modelConfig.supportedDurations.reduce((prev, curr) =>
        Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
      );
      if (clampedDuration !== duration) {
        console.log(`⚠️ Duration adjusted from ${duration}s to ${clampedDuration}s for ${model} (supported: ${modelConfig.supportedDurations.join(', ')})`);
      }
    } else {
      // Для Veo - обычная валидация
      clampedDuration = Math.max(2, Math.min(modelConfig.maxDuration, duration));
      if (clampedDuration !== duration) {
        console.log(`⚠️ Duration adjusted from ${duration}s to ${clampedDuration}s for ${model}`);
      }
    }

    // Расчет стоимости
    const costUSD = clampedDuration * modelConfig.pricePerSecond;

    const startTime = Date.now();

    try {
      console.log(`🎬 Starting ${model} generation via Kie.ai...`);
      console.log(`   • Prompt: ${prompt}`);
      console.log(`   • Duration: ${clampedDuration}s`);  
      console.log(`   • Aspect Ratio: ${aspectRatio}`);
      console.log(`   • Estimated cost: $${costUSD.toFixed(3)}`);

      // Используем правильное название модели и endpoint из конфигурации
      const kieModelName = modelConfig.kieModelName;
      const endpoint = `${this.baseUrl}${modelConfig.endpoint}`;
      
      // Формируем запрос к Kie.ai API
      const requestBody: any = {
        model: kieModelName,
        prompt: prompt,
        duration: clampedDuration,
        aspectRatio: aspectRatio,
        ...(imageUrl && { imageUrl }),
        ...(userId && { userId }),
        ...(projectId && { projectId })
      };

      // Добавляем специфичные параметры для Runway
      if (modelConfig.endpoint === '/runway/generate') {
        requestBody.videoQuality = 'high'; // Обязательный параметр для Runway
      }

      console.log(`🎯 Using model: ${kieModelName} at endpoint: ${endpoint}`);

      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 минут на генерацию
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Video generation failed');
      }

      const processingTime = Date.now() - startTime;

      console.log(`✅ ${model} generation completed in ${processingTime}ms`);
      console.log(`   • Video URL: ${response.data.data.videoUrl}`);
      console.log(`   • Actual cost: $${costUSD.toFixed(3)}`);

      return {
        videoUrl: response.data.data.videoUrl,
        cost: costUSD,
        duration: clampedDuration,
        processingTime
      };

    } catch (error: any) {
      console.error(`❌ Kie.ai ${model} generation failed:`, error.response?.data || error.message);
      
      // Проверяем специфичные ошибки Kie.ai
      if (error.response?.status === 401) {
        throw new Error('Invalid Kie.ai API key. Please check KIE_AI_API_KEY environment variable.');
      } else if (error.response?.status === 402) {
        throw new Error('Insufficient credits in Kie.ai account. Please top up your balance.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      }
      
      throw new Error(`Kie.ai video generation failed: ${error.message}`);
    }
  }

  /**
   * Расчет стоимости генерации
   */
  calculateCost(model: string, durationSeconds: number): number {
    const modelConfig = KIE_AI_MODELS[model as keyof typeof KIE_AI_MODELS];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`);
    }
    
    return durationSeconds * modelConfig.pricePerSecond;
  }

  /**
   * Расчет стоимости в звездах с наценкой
   */
  calculateCostInStars(model: string, durationSeconds: number): number {
    // Константы из системы
    const STAR_COST_USD = 0.016; // $0.016 за звезду
    const MARKUP_RATE = 1.5; // наценка 50%
    
    const baseCostUSD = this.calculateCost(model, durationSeconds);
    const baseCostStars = baseCostUSD / STAR_COST_USD;
    const finalCostStars = baseCostStars * MARKUP_RATE;
    
    return Math.floor(finalCostStars);
  }

  /**
   * Проверить поддержку модели
   */
  isModelSupported(model: string): boolean {
    return model in KIE_AI_MODELS;
  }

  /**
   * Получить информацию о модели
   */
  getModelInfo(model: string) {
    return KIE_AI_MODELS[model as keyof typeof KIE_AI_MODELS] || null;
  }

  /**
   * Получить все доступные модели
   */
  getAllModels() {
    return KIE_AI_MODELS;
  }
}