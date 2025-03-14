import { inngest } from '@/core/inngest-client/clients'

// 2. Тестовая функция
export const helloWorld = inngest.createFunction(
  {
    id: 'hello-world-test', // Уникальный ID функции
    retries: 3, // Количество попыток
  },
  { event: 'test/hello' }, // Триггерное событие
  async ({ event, step }) => {
    // Логика функции
    await step.sleep('pause', '2s')
    return {
      success: true,
      message: `Привет, ${event.data.name || 'Мир'}! 👋`,
    }
  }
)
