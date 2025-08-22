# 🚀 Быстрый деплой на Railway

## Что настроено

✅ **railway.toml** - конфигурация для Railway  
✅ **production branch** - создана и запушена  
✅ **.env.example** - шаблон всех переменных окружения  
✅ **setup-railway-env.sh** - скрипт для настройки переменных  
✅ **Health endpoint** - `/health` для Railway health checks  

## Быстрый старт

### 1. Установите Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Войдите в Railway
```bash
railway login
```

### 3. Создайте проект в Railway
```bash
railway init
```

### 4. Настройте переменные окружения
```bash
# Запустите интерактивный скрипт
./scripts/setup-railway-env.sh

# Или вручную через CLI
railway variables set NODE_ENV=production
railway variables set APP_ENV=staging --environment staging
```

### 5. Создайте два окружения

**В Railway Dashboard:**
1. Перейдите в `Environments`
2. Создайте `staging` (привязать к ветке `main`)
3. Создайте `production` (привязать к ветке `production`)

### 6. Задеплойте

**Staging:**
```bash
git push origin main
```

**Production:**
```bash
git push origin production
```

## Структура окружений

| Окружение | Ветка | URL | Боты |
|-----------|-------|-----|------|
| **Staging** | `main` | `https://your-app-staging.railway.app` | TEST_1, TEST_2 |
| **Production** | `production` | `https://your-app.railway.app` | BOT_1-10 |

## Workflow

```
feature-branch → main → staging deployment
       ↓
    testing ✅
       ↓
main → production → production deployment
```

## Проверки

✅ Health check: `GET /health`  
✅ API test: `GET /api/test`  
✅ Inngest: `GET /api/inngest`  

## Переменные окружения

📝 Используйте `.env.example` как reference  
🔧 Запустите `./scripts/setup-railway-env.sh` для автоматической настройки  
🌐 Обновите URL'ы для каждого окружения:

**Staging:**
- `BASE_URL=https://your-staging-app.railway.app`
- `APP_ENV=staging`

**Production:**  
- `BASE_URL=https://your-production-app.railway.app`
- `APP_ENV=production`

## Полезные команды

```bash
# Проверить статус
railway status

# Посмотреть логи
railway logs

# Посмотреть переменные
railway variables

# Переключить окружение
railway environment staging
railway environment production

# Запустить локально с Railway переменными
railway run npm start
```

## 🆘 Troubleshooting

**Проблемы с build:**
- Проверьте логи: `railway logs`
- Убедитесь что все зависимости в `package.json`

**Health check fails:**
- Проверьте что сервер отвечает на `/health`
- Проверьте PORT из Railway: `${{ PORT }}`

**Переменные не работают:**
- Проверьте: `railway variables`
- Убедитесь что выбрано правильное окружение

**Bot tokens:**
- Staging использует `BOT_TOKEN_TEST_1`, `BOT_TOKEN_TEST_2`
- Production использует `BOT_TOKEN_1` до `BOT_TOKEN_10`

Готово! 🎉