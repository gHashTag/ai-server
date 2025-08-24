import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow'

export class AiServerApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AI Server API',
    name: 'aiServerApi',
    icon: 'file:aiserver.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with AI Server API',
    defaults: {
      name: 'AI Server API',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'aiServerApi',
        required: true,
      },
    ],
    requestDefaults: {
      baseURL: '={{$credentials.url}}',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Instagram',
            value: 'instagram',
          },
          {
            name: 'Generation',
            value: 'generation',
          },
          {
            name: 'User',
            value: 'user',
          },
          {
            name: 'Webhook',
            value: 'webhook',
          },
        ],
        default: 'instagram',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['instagram'],
          },
        },
        options: [
          {
            name: 'Scrape Profile',
            value: 'scrapeProfile',
            action: 'Scrape instagram profile',
          },
          {
            name: 'Analyze Competitors',
            value: 'analyzeCompetitors',
            action: 'Analyze competitors',
          },
        ],
        default: 'scrapeProfile',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['generation'],
          },
        },
        options: [
          {
            name: 'Generate Neuro Image',
            value: 'generateNeuroImage',
            action: 'Generate neuro image',
          },
          {
            name: 'Generate Text to Video',
            value: 'generateTextToVideo',
            action: 'Generate text to video',
          },
          {
            name: 'Generate Speech',
            value: 'generateSpeech',
            action: 'Generate speech',
          },
        ],
        default: 'generateNeuroImage',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['user'],
          },
        },
        options: [
          {
            name: 'Get User Data',
            value: 'getUserData',
            action: 'Get user data',
          },
          {
            name: 'Update Balance',
            value: 'updateBalance',
            action: 'Update user balance',
          },
        ],
        default: 'getUserData',
      },
      // Instagram scrape profile fields
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['instagram'],
            operation: ['scrapeProfile'],
          },
        },
        default: '',
        description: 'Instagram username to scrape',
      },
      // Instagram analyze competitors fields
      {
        displayName: 'Telegram ID',
        name: 'telegramId',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['instagram'],
            operation: ['analyzeCompetitors'],
          },
        },
        default: '',
        description: 'Telegram user ID',
      },
      {
        displayName: 'Competitors Count',
        name: 'competitorsCount',
        type: 'number',
        required: false,
        displayOptions: {
          show: {
            resource: ['instagram'],
            operation: ['analyzeCompetitors'],
          },
        },
        default: 3,
        description: 'Number of competitors to analyze',
      },
      // Generation fields
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['generation'],
            operation: [
              'generateNeuroImage',
              'generateTextToVideo',
              'generateSpeech',
            ],
          },
        },
        default: '',
        description: 'Generation prompt',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['generation'],
            operation: ['generateNeuroImage'],
          },
        },
        options: [
          {
            name: 'FLUX Schnell',
            value: 'flux-schnell',
          },
          {
            name: 'FLUX Dev',
            value: 'flux-dev',
          },
          {
            name: 'Midjourney',
            value: 'midjourney',
          },
        ],
        default: 'flux-schnell',
      },
      {
        displayName: 'Aspect Ratio',
        name: 'aspectRatio',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['generation'],
            operation: ['generateNeuroImage'],
          },
        },
        options: [
          {
            name: '1:1 (Square)',
            value: '1:1',
          },
          {
            name: '16:9 (Landscape)',
            value: '16:9',
          },
          {
            name: '9:16 (Portrait)',
            value: '9:16',
          },
        ],
        default: '1:1',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string
        const operation = this.getNodeParameter('operation', i) as string

        let responseData

        if (resource === 'instagram') {
          if (operation === 'scrapeProfile') {
            const username = this.getNodeParameter('username', i) as string

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                'aiServerApi',
                {
                  method: 'POST',
                  url: '/api/inngest/instagram-scraper',
                  body: {
                    username,
                    source: 'n8n',
                  },
                }
              )
          } else if (operation === 'analyzeCompetitors') {
            const telegramId = this.getNodeParameter('telegramId', i) as string
            const competitorsCount = this.getNodeParameter(
              'competitorsCount',
              i
            ) as number

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                'aiServerApi',
                {
                  method: 'POST',
                  url: '/api/inngest/analyze-competitors',
                  body: {
                    telegram_id: telegramId,
                    competitors_count: competitorsCount,
                    source: 'n8n',
                  },
                }
              )
          }
        } else if (resource === 'generation') {
          if (operation === 'generateNeuroImage') {
            const prompt = this.getNodeParameter('prompt', i) as string
            const model = this.getNodeParameter('model', i) as string
            const aspectRatio = this.getNodeParameter(
              'aspectRatio',
              i
            ) as string

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                'aiServerApi',
                {
                  method: 'POST',
                  url: '/api/generation/neuro-image',
                  body: {
                    prompt,
                    model,
                    aspect_ratio: aspectRatio,
                    source: 'n8n',
                  },
                }
              )
          } else if (operation === 'generateTextToVideo') {
            const prompt = this.getNodeParameter('prompt', i) as string

            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                'aiServerApi',
                {
                  method: 'POST',
                  url: '/api/generation/text-to-video',
                  body: {
                    prompt,
                    source: 'n8n',
                  },
                }
              )
          }
        }

        const executionData = this.helpers.constructExecutionMetaData(
          [{ json: responseData }],
          { itemData: { item: i } }
        )

        returnData.push(...executionData)
      } catch (error) {
        if (this.continueOnFail()) {
          const executionData = this.helpers.constructExecutionMetaData(
            [{ json: { error: error.message } }],
            { itemData: { item: i } }
          )
          returnData.push(...executionData)
          continue
        }
        throw new NodeOperationError(this.getNode(), error, {
          itemIndex: i,
        })
      }
    }

    return [returnData]
  }
}
