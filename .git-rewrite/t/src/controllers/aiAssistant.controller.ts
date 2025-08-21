import { Request, Response } from 'express'
import { AiAssistantService } from '@/services/aiAssistantService'

export class AiAssistantController {
  private aiAssistantService: AiAssistantService

  constructor() {
    this.aiAssistantService = new AiAssistantService()
  }

  public async getAiResponse(req: Request, res: Response): Promise<void> {
    try {
      const { telegram_id, assistant_id, report, language_code, full_name } =
        req.body
      const { ai_response } = await this.aiAssistantService.getAiResponse(
        telegram_id,
        assistant_id,
        report,
        language_code,
        full_name
      )
      res.status(200).json({ ai_response })
    } catch (error) {
      console.error('Error in getAiResponse:', error)
      res.status(500).json({ message: 'Internal server error' })
    }
  }
}
// curl -X POST http://localhost:3000/ai-assistant/ai-response \
//      -H "Content-Type: application/json" \
//      -d '{
//            "assistantId": "asst_PeA6kj3k9LmspxDVRrnPa8ux",
//            "prompt": "Your prompt here",
//            "language_code": "en",
//            "fullName": "John Doe"
//          }'
// {"ai_response":"Hello, John Doe! How can I assist you today in the self-realization game Lila Chakra? If you have any questions or need guidance, feel free to ask!"}%
