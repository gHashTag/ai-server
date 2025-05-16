import { inngest } from '@/core/inngest/clients'

// 2. Тестовая функция
export const helloWorld = inngest.createFunction(
  {
    name: 'hello-world-test', // Changed from id to name for v2
    retries: 3, // Количество попыток
  },
  { event: 'test/hello' }, // Триггерное событие
  async ({ event, step }) => {
    // Логика функции
    await step.sleep('2s') // Removed step ID 'pause' for v2 compatibility
    return {
      success: true,
      message: `Привет, ${event.data.name || 'Мир'}! 👋`,
    }
  }
)
