import { inngest } from '@/core/inngest/clients'
import { slugify } from 'inngest' // For v3 migration

// 2. Тестовая функция
export const helloWorld = inngest.createFunction(
  {
    id: slugify('hello-world-test'), // v3 requires id
    name: '👋 Hello World Test', // Optional display name
    retries: 3,
  },
  { event: 'test/hello' },
  async ({ event, step }) => {
    await step.sleep('wait_2_seconds_hello', '2s') // v3 step.sleep requires an ID
    return {
      success: true,
      message: `Привет, ${event.data.name || 'Мир'}! 👋`,
    }
  }
)
