import { jest } from "@jest/globals"

import { jest } from '@jest/globals'

export const promises = {
  readFile: jest.fn().mockResolvedValue('file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
  stat: jest.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    mtime: new Date(),
    ctime: new Date()
  }),
  access: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined)
}

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
  on: jest.fn(),
  destroy: jest.fn()
})

export default {
  promises,
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