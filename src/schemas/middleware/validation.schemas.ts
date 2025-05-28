import { z } from 'zod'

// Схемы для middleware валидации
export const requestValidationSchema = z.object({
  body: z.unknown().optional(),
  params: z.unknown().optional(),
  query: z.unknown().optional(),
  headers: z.unknown().optional(),
})

// Схемы для файлов (multer)
export const fileValidationSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(),
  destination: z.string().optional(),
  filename: z.string().optional(),
  path: z.string().optional(),
  buffer: z.instanceof(Buffer).optional(),
})

export const filesValidationSchema = z.array(fileValidationSchema)

// Схемы для валидации ошибок
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.unknown().optional(),
})

export const validationErrorsSchema = z.array(validationErrorSchema)

// Типы TypeScript из схем
export type RequestValidation = z.infer<typeof requestValidationSchema>
export type FileValidation = z.infer<typeof fileValidationSchema>
export type FilesValidation = z.infer<typeof filesValidationSchema>
export type ValidationError = z.infer<typeof validationErrorSchema>
export type ValidationErrors = z.infer<typeof validationErrorsSchema>
