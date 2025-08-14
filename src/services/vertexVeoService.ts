import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { errorMessage, errorMessageAdmin } from '@/helpers';

const execAsync = promisify(exec);

/**
 * Сервис для работы с Google Veo через Vertex AI API
 * Основан на официальной документации: 
 * https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
 */

// Конфигурация моделей Veo
export const VEO_MODELS = {
  'veo-3.0-generate-preview': {
    name: 'Veo 3 Preview',
    description: 'Latest Veo 3 model with best quality',
    pricing: 0.40, // per second
    features: ['text-to-video', 'image-to-video', 'resolution-control']
  },
  'veo-3.0-generate-fast': {
    name: 'Veo 3 Fast',
    description: 'Faster Veo 3 generation with optimized settings',
    pricing: 0.30, // per second (меньше за быструю генерацию)
    features: ['text-to-video', 'image-to-video', 'fast-generation']
  },
  'veo-2.0-generate-001': {
    name: 'Veo 2',
    description: 'Stable Veo 2 model',
    pricing: 0.30, // per second
    features: ['text-to-video', 'image-to-video', 'video-extension', 'frame-interpolation']
  }
};

interface VeoGenerationOptions {
  prompt: string;
  modelId?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: string; // for Veo 3 only
  sampleCount?: number; // number of videos to generate (1-4)
  seed?: number;
  storageUri?: string; // GCS bucket for output
  image?: {
    bytesBase64Encoded?: string;
    gcsUri?: string;
    mimeType: 'image/jpeg' | 'image/png';
  };
}

export class VertexVeoService {
  private projectId: string;
  private location: string = 'us-central1';
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Получить токен доступа через gcloud
   */
  private async getAccessToken(): Promise<string> {
    try {
      const { stdout } = await execAsync('gcloud auth print-access-token');
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw new Error('Failed to authenticate with Google Cloud');
    }
  }

  /**
   * Начать генерацию видео (long-running operation)
   */
  async generateVideo(options: VeoGenerationOptions): Promise<string> {
    const {
      prompt,
      modelId = 'veo-3.0-generate-preview',
      aspectRatio = '16:9',
      resolution,
      sampleCount = 1,
      seed,
      storageUri,
      image
    } = options;

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelId}:predictLongRunning`;

    // Подготовка тела запроса
    const requestBody: any = {
      instances: [
        {
          prompt
        }
      ],
      parameters: {
        aspectRatio,
        sampleCount
      }
    };

    // Добавляем опциональные параметры
    if (resolution && modelId.includes('veo-3')) {
      requestBody.parameters.resolution = resolution;
    }
    
    if (seed !== undefined) {
      requestBody.parameters.seed = seed;
    }
    
    if (storageUri) {
      requestBody.parameters.storageUri = storageUri;
    }

    // Добавляем изображение для image-to-video
    if (image) {
      requestBody.instances[0].image = image;
    }

    try {
      const accessToken = await this.getAccessToken();
      
      console.log('🎬 Starting Veo video generation...');
      console.log('Model:', modelId);
      console.log('Prompt:', prompt);
      
      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const operationName = response.data.name;
      console.log('✅ Operation started:', operationName);
      
      return operationName;
    } catch (error: any) {
      console.error('❌ Failed to start video generation:', error.response?.data || error.message);
      throw new Error(`Failed to start video generation: ${error.message}`);
    }
  }

  /**
   * Проверить статус операции генерации
   */
  async checkOperationStatus(operationName: string): Promise<any> {
    const modelId = this.extractModelId(operationName);
    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelId}:fetchPredictOperation`;

    const requestBody = {
      operationName
    };

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to check operation status:', error.response?.data || error.message);
      throw new Error(`Failed to check operation status: ${error.message}`);
    }
  }

  /**
   * Ждать завершения операции
   */
  async waitForCompletion(operationName: string, maxWaitTime: number = 300000): Promise<any> {
    const startTime = Date.now();
    const checkInterval = 5000; // проверяем каждые 5 секунд

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkOperationStatus(operationName);
      
      if (status.done) {
        if (status.response) {
          console.log('✅ Video generation completed!');
          return status.response;
        } else if (status.error) {
          throw new Error(`Video generation failed: ${status.error.message}`);
        }
      }
      
      console.log('⏳ Still processing... waiting 5 seconds');
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Video generation timeout');
  }

  /**
   * Полный цикл генерации видео с ожиданием результата
   */
  async generateAndWaitForVideo(options: VeoGenerationOptions): Promise<{
    videos: Array<{
      gcsUri?: string;
      bytesBase64Encoded?: string;
      mimeType: string;
    }>;
    raiMediaFilteredCount: number;
  }> {
    // Начинаем генерацию
    const operationName = await this.generateVideo(options);
    
    // Ждём завершения
    const result = await this.waitForCompletion(operationName);
    
    return result;
  }

  /**
   * Скачать видео из GCS
   */
  async downloadVideoFromGCS(gcsUri: string, localPath: string): Promise<void> {
    try {
      // Используем gsutil для скачивания
      const command = `gsutil cp "${gcsUri}" "${localPath}"`;
      await execAsync(command);
      console.log('✅ Video downloaded to:', localPath);
    } catch (error) {
      console.error('Failed to download video from GCS:', error);
      throw new Error('Failed to download video');
    }
  }

  /**
   * Конвертировать изображение в base64
   */
  async imageToBase64(imagePath: string): Promise<string> {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString('base64');
  }

  /**
   * Извлечь model ID из operation name
   */
  private extractModelId(operationName: string): string {
    const match = operationName.match(/models\/([^\/]+)/);
    return match ? match[1] : 'veo-3.0-generate-preview';
  }

  /**
   * Расчёт стоимости в долларах (себестоимость)
   */
  calculateCost(modelId: string, durationSeconds: number): number {
    const model = VEO_MODELS[modelId];
    if (!model) {
      return durationSeconds * 0.40; // default pricing
    }
    return durationSeconds * model.pricing;
  }

  /**
   * Расчёт стоимости в звёздах с наценкой
   */
  calculateCostInStars(modelId: string, durationSeconds: number): number {
    // Константы из вашей системы
    const STAR_COST = 0.016; // $0.016 за звезду
    const INTEREST_RATE = 1.5; // наценка 150%
    
    // Получаем себестоимость в долларах
    const baseCostInDollars = this.calculateCost(modelId, durationSeconds);
    
    // Конвертируем в звёзды
    const baseCostInStars = baseCostInDollars / STAR_COST;
    
    // Применяем наценку
    const finalCostInStars = baseCostInStars * INTEREST_RATE;
    
    // Округляем вниз (как в вашей системе)
    return Math.floor(finalCostInStars);
  }
}
