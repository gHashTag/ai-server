describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.USE_INNGEST).toBe('false')
    expect(process.env.FALLBACK_MODE).toBe('true')
  })
})