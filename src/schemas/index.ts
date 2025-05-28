// Центральный экспорт всех Zod схем валидации
// Этот файл обеспечивает единую точку доступа ко всем схемам проекта

// API схемы для контроллеров
export * from './api/generation.schemas'
export * from './api/stats.schemas'
// export * from './api/user.schemas' // TODO: создать
// export * from './api/video.schemas' // TODO: создать
// export * from './api/broadcast.schemas' // TODO: создать
// export * from './api/room.schemas' // TODO: создать

// Webhook схемы
export * from './webhooks/replicate.schemas'
export * from './webhooks/synclabs.schemas'
export * from './webhooks/robokassa.schemas'

// Схемы сервисов
// export * from './services/generate.schemas' // TODO: создать
// export * from './services/models.schemas' // TODO: создать
// export * from './services/cost.schemas' // TODO: создать
// export * from './services/auth.schemas' // TODO: создать

// Общие схемы
export * from './common/base.schemas'
export * from './common/telegram.schemas'

// Middleware схемы
export * from './middleware/validation.schemas'
