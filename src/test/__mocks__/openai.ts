import { jest } from "@jest/globals"

export class OpenAI {
  constructor(config?: any) {}

  chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response from OpenAI'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      })
    }
  }

  images = {
    generate: jest.fn().mockResolvedValue({
      data: [
        {
          url: 'https://test-image-url.jpg'
        }
      ]
    }),
    edit: jest.fn().mockResolvedValue({
      data: [
        {
          url: 'https://test-edited-image-url.jpg'
        }
      ]
    }),
    createVariation: jest.fn().mockResolvedValue({
      data: [
        {
          url: 'https://test-variation-url.jpg'
        }
      ]
    })
  }

  audio = {
    speech: {
      create: jest.fn().mockResolvedValue({
        body: Buffer.from('audio data'),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
        text: jest.fn().mockResolvedValue('audio data')
      })
    },
    transcriptions: {
      create: jest.fn().mockResolvedValue({
        text: 'Test transcription'
      })
    },
    translations: {
      create: jest.fn().mockResolvedValue({
        text: 'Test translation'
      })
    }
  }

  embeddings = {
    create: jest.fn().mockResolvedValue({
      data: [
        {
          embedding: new Array(1536).fill(0.1),
          index: 0
        }
      ],
      usage: {
        prompt_tokens: 10,
        total_tokens: 10
      }
    })
  }

  beta = {
    assistants: {
      create: jest.fn().mockResolvedValue({
        id: 'asst_test',
        object: 'assistant',
        name: 'Test Assistant',
        description: 'Test assistant description',
        model: 'gpt-4',
        instructions: 'Test instructions'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'asst_test',
        object: 'assistant',
        name: 'Test Assistant',
        description: 'Test assistant description',
        model: 'gpt-4',
        instructions: 'Test instructions'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'asst_test',
        object: 'assistant',
        name: 'Updated Test Assistant'
      }),
      list: jest.fn().mockResolvedValue({
        data: []
      }),
      del: jest.fn().mockResolvedValue({
        id: 'asst_test',
        deleted: true
      })
    },
    threads: {
      create: jest.fn().mockResolvedValue({
        id: 'thread_test',
        object: 'thread'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'thread_test',
        object: 'thread'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'thread_test',
        object: 'thread'
      }),
      del: jest.fn().mockResolvedValue({
        id: 'thread_test',
        deleted: true
      }),
      messages: {
        create: jest.fn().mockResolvedValue({
          id: 'msg_test',
          object: 'thread.message',
          role: 'user',
          content: [
            {
              type: 'text',
              text: {
                value: 'Test message'
              }
            }
          ]
        }),
        list: jest.fn().mockResolvedValue({
          data: []
        })
      },
      runs: {
        create: jest.fn().mockResolvedValue({
          id: 'run_test',
          object: 'thread.run',
          status: 'queued'
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'run_test',
          object: 'thread.run',
          status: 'completed'
        }),
        list: jest.fn().mockResolvedValue({
          data: []
        })
      }
    }
  }
}

export default OpenAI