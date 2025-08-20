/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveProperty(keyPath: string, value?: any): R;
    }
  }
}