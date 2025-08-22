import { createTasksService } from '@/services'

export class CreateTasksController {
  private createTasksService: typeof createTasksService

  constructor() {
    this.createTasksService = createTasksService
  }

  public createTasks = async (req: any, res: any): Promise<void> => {
    const { telegram_id }: { telegram_id: string } = req.body

    const tasks = await this.createTasksService(telegram_id)

    res.json({ tasks })
  }
}
