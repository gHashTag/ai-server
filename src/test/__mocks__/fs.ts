import { jest } from '@jest/globals'

export const promises = {
  readFile: (jest.fn() as any).mockResolvedValue('file content'),
  writeFile: (jest.fn() as any).mockResolvedValue(undefined),
  unlink: (jest.fn() as any).mockResolvedValue(undefined),
  mkdir: (jest.fn() as any).mockResolvedValue(undefined),
  rmdir: (jest.fn() as any).mockResolvedValue(undefined),
  readdir: (jest.fn() as any).mockResolvedValue(['file1.txt', 'file2.txt']),
  stat: (jest.fn() as any).mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    mtime: new Date(),
    ctime: new Date()
  }),
  access: (jest.fn() as any).mockResolvedValue(undefined),
  copyFile: (jest.fn() as any).mockResolvedValue(undefined),
  rename: (jest.fn() as any).mockResolvedValue(undefined)
}

export const stat = (jest.fn() as any).mockImplementation((path, callback) => {
  if (callback) {
    callback(null, {
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date(),
      ctime: new Date()
    })
  }
})

export const mkdir = (jest.fn() as any).mockImplementation((path, callback) => {
  if (callback) callback(null)
})

export const writeFile = (jest.fn() as any).mockImplementation((path, data, callback) => {
  if (callback) callback(null)
})

export const readFileSync = jest.fn().mockReturnValue('file content')
export const writeFileSync = jest.fn().mockReturnValue(undefined)
export const existsSync = jest.fn().mockReturnValue(true)
export const mkdirSync = jest.fn().mockReturnValue(undefined)
export const readdirSync = jest.fn().mockReturnValue(['file1.txt', 'file2.txt'])
export const statSync = jest.fn().mockReturnValue({
  isFile: () => true,
  isDirectory: () => false,
  size: 1024,
  mtime: new Date(),
  ctime: new Date()
})
export const unlinkSync = jest.fn().mockReturnValue(undefined)
export const rmdirSync = jest.fn().mockReturnValue(undefined)
export const copyFileSync = jest.fn().mockReturnValue(undefined)
export const renameSync = jest.fn().mockReturnValue(undefined)

export const createReadStream = jest.fn().mockReturnValue({
  pipe: jest.fn(),
  on: jest.fn(),
  read: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  destroy: jest.fn()
})

export const createWriteStream = jest.fn().mockReturnValue({
  write: jest.fn(),
  end: jest.fn(),
  on: jest.fn().mockImplementation((event, callback) => {
    if (event === 'open' && typeof callback === 'function') {
      // Симулируем открытие файла
      setTimeout(() => (callback as Function)(), 0)
    }
    return {}
  }),
  destroy: jest.fn()
})

export default {
  promises,
  stat,
  mkdir,
  writeFile,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
  copyFileSync,
  renameSync,
  createReadStream,
  createWriteStream
}