export const retry = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    if (attempts <= 1) throw error
    await new Promise(resolve => setTimeout(resolve, delay))
    return retry(fn, attempts - 1, delay * 2)
  }
}
