import { jest } from "@jest/globals"

export const mockAxios = {
  get: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  post: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  put: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  patch: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  delete: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  request: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  head: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  options: (jest.fn() as any).mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  create: jest.fn().mockReturnValue({
    get: (jest.fn() as any).mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    }),
    post: (jest.fn() as any).mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    }),
    put: (jest.fn() as any).mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    }),
    patch: (jest.fn() as any).mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    }),
    delete: (jest.fn() as any).mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    })
  }),
  defaults: {
    headers: {
      common: {},
      delete: {},
      get: {},
      head: {},
      post: {},
      put: {},
      patch: {}
    },
    timeout: 0,
    baseURL: '',
    transformRequest: [],
    transformResponse: [],
    paramsSerializer: jest.fn(),
    adapter: jest.fn(),
    validateStatus: jest.fn().mockReturnValue(true)
  },
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn()
    },
    response: {
      use: jest.fn(),
      eject: jest.fn()
    }
  }
}

export default mockAxios