import { jest } from '@jest/globals'

export const createClient = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: (jest.fn() as any).mockResolvedValue({ data: {}, error: null }),
    maybeSingle: (jest.fn() as any).mockResolvedValue({ data: {}, error: null }),
    csv: (jest.fn() as any).mockResolvedValue({ data: '', error: null }),
    geojson: (jest.fn() as any).mockResolvedValue({ data: {}, error: null }),
    explain: jest.fn().mockReturnThis(),
    rollback: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis(),
    then: (jest.fn() as any).mockResolvedValue({ data: [], error: null })
  })),
  storage: {
    from: jest.fn(() => ({
      upload: (jest.fn() as any).mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: (jest.fn() as any).mockResolvedValue({ data: new Blob(), error: null }),
      list: (jest.fn() as any).mockResolvedValue({ data: [], error: null }),
      update: (jest.fn() as any).mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      move: (jest.fn() as any).mockResolvedValue({ data: { message: 'Successfully moved' }, error: null }),
      copy: (jest.fn() as any).mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      remove: (jest.fn() as any).mockResolvedValue({ data: [], error: null }),
      createSignedUrl: (jest.fn() as any).mockResolvedValue({ data: { signedUrl: 'http://test-url' }, error: null }),
      createSignedUrls: (jest.fn() as any).mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://test-url' } })
    }))
  },
  auth: {
    signUp: (jest.fn() as any).mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: (jest.fn() as any).mockResolvedValue({ data: { user: null }, error: null }),
    signOut: (jest.fn() as any).mockResolvedValue({ error: null }),
    getUser: (jest.fn() as any).mockResolvedValue({ data: { user: null }, error: null }),
    getSession: (jest.fn() as any).mockResolvedValue({ data: { session: null }, error: null }),
    refreshSession: (jest.fn() as any).mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
  }
}))

export default {
  createClient
}