import { ICredentialType, INodeProperties } from 'n8n-workflow'

export class AiServerApi implements ICredentialType {
  name = 'aiServerApi'
  displayName = 'AI Server API'
  documentationUrl = 'https://docs.ai-server.com/api'
  properties: INodeProperties[] = [
    {
      displayName: 'API URL',
      name: 'url',
      type: 'string',
      default: 'http://localhost:3000',
      description: 'The base URL of your AI Server API',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'The API key for authentication',
    },
    {
      displayName: 'Secret Key',
      name: 'secretKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'The secret key for request signing',
    },
  ]

  authenticate = {
    type: 'generic',
    properties: {
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
        'X-Secret-Key': '={{$credentials.secretKey}}',
      },
    },
  } as const
}
