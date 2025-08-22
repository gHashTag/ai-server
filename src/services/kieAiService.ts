import axios from 'axios';
import { errorMessage, errorMessageAdmin } from '@/helpers';

/**
 * Сервис для работы с Kie.ai API
 * Документация: https://docs.kie.ai
 * Экономия по сравнению с Vertex AI: до 87%
 */

// Конфигурация моделей Kie.ai (ИСПРАВЛЕНО: правильные model IDs)
export const KIE_AI_MODELS = {
  'veo3_fast': {
    name: 'Veo 3 Fast',
    description: 'Быстрая генерация',
    pricePerSecond: 0.05, // $0.05/сек (87% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1']
  },
  'veo3': {
    name: 'Veo 3 Quality', 
    description: 'Премиум качество',
    pricePerSecond: 0.25, // $0.25/сек (37% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1']
  },
  'runway-aleph': {
    name: 'Runway Aleph',
    description: 'Продвинутое редактирование',
    pricePerSecond: 0.30, // $0.30/сек
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1']
  }
};

interface KieAiGenerationOptions {
  model: 'veo3_fast' | 'veo3' | 'runway-aleph';
  prompt: string;
  duration: number; // 2-10 секунд
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

    // Валидация длительности
    const clampedDuration = Math.max(2, Math.min(modelConfig.maxDuration, duration));
    if (clampedDuration !== duration) {
      console.log(`⚠️ Duration adjusted from ${duration}s to ${clampedDuration}s for ${model}`);
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

      // Формируем запрос к Kie.ai API
      const requestBody = {
        model: model,
        prompt: prompt,
        duration: clampedDuration,
        aspectRatio: aspectRatio,
        ...(imageUrl && { imageUrl }),
        ...(userId && { userId }),
        ...(projectId && { projectId })
      };

      const response = await axios.post(`${this.baseUrl}/veo/generate`, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 минут на генерацию
      });

      // Kie.ai возвращает {code: 200, msg: "success", data: {...}}
      if (response.data.code !== 200) {
        throw new Error(response.data.msg || 'Video generation failed');
      }

      if (!response.data.data || !response.data.data.taskId) {
        throw new Error('Invalid response from Kie.ai: missing taskId');
      }

      const taskId = response.data.data.taskId;
      console.log(`📋 Task created with ID: ${taskId}`);
      
      // Kie.ai работает асинхронно, нужно дождаться завершения задачи
      console.log('⏳ Waiting for video generation to complete...');
      
      // Polling для получения результата (максимум 5 минут)
      const maxAttempts = 60; // 60 попыток по 5 секунд = 5 минут
      let videoUrl = null;
      
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд
        
        try {
          // Пробуем разные варианты URL для статуса
          const statusResponse = await axios.get(`${this.baseUrl}/task/status/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => {
            // Если первый вариант не работает, пробуем другой
            return axios.get(`${this.baseUrl}/veo/status/${taskId}`, {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              }
            });
          });
          
          if (statusResponse.data.code === 200 && statusResponse.data.data) {
            if (statusResponse.data.data.status === 'completed' && statusResponse.data.data.videoUrl) {
              videoUrl = statusResponse.data.data.videoUrl;
              break;
            } else if (statusResponse.data.data.status === 'failed') {
              throw new Error(`Video generation failed: ${statusResponse.data.data.error || 'Unknown error'}`);
            }
          }
        } catch (statusError) {
          // Продолжаем polling если не можем получить статус
          console.log(`⏳ Generation in progress... (attempt ${i + 1}/${maxAttempts})`);
        }
      }
      
      if (!videoUrl) {
        // Если за 5 минут видео не готово, возвращаем taskId для последующей проверки
        console.warn(`⚠️ Video generation is taking longer than expected. Task ID: ${taskId}`);
        // Временное решение: возвращаем taskId как URL
        videoUrl = `kie-task://${taskId}`;
      }

      const processingTime = Date.now() - startTime;

      console.log(`✅ ${model} generation completed in ${processingTime}ms`);
      console.log(`   • Video URL: ${videoUrl}`);
      console.log(`   • Actual cost: $${costUSD.toFixed(3)}`);

      return {
        videoUrl: videoUrl,
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