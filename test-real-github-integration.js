/**
 * Реальный тест интеграции с GitHub Issues
 * Создает настоящие issues и тестирует синхронизацию
 */

const axios = require('axios');
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.DEFAULT_GITHUB_REPO || 'gHashTag/ai-server';

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testRealGitHubIntegration() {
  log('\n🚀 Тест реальной интеграции с GitHub Issues\n', colors.bold);

  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your_github_token_here') {
    log('❌ GitHub токен не настроен!', colors.red);
    log('Установите GITHUB_TOKEN в .env файле', colors.yellow);
    return;
  }

  try {
    // 1. Проверяем доступ к GitHub API
    log('📡 Тест 1: Проверка доступа к GitHub API', colors.blue);
    const repoResponse = await axios.get(`https://api.github.com/repos/${REPO}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    log(`✅ Репозиторий доступен: ${repoResponse.data.full_name}`, colors.green);
    log(`📊 Issues: ${repoResponse.data.open_issues_count} открытых`, colors.blue);

    // 2. Получаем список существующих issues
    log('\n📋 Тест 2: Получение существующих issues', colors.blue);
    const issuesResponse = await axios.get(`https://api.github.com/repos/${REPO}/issues`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params: {
        state: 'open',
        per_page: 5
      }
    });

    log(`✅ Найдено ${issuesResponse.data.length} открытых issues:`, colors.green);
    issuesResponse.data.forEach((issue, index) => {
      log(`   ${index + 1}. #${issue.number}: ${issue.title}`, colors.reset);
    });

    // 3. Создаем тестовую issue
    log('\n📝 Тест 3: Создание тестовой issue для Dart AI', colors.blue);
    const testIssue = {
      title: '[Dart AI Test] Тестовая задача для синхронизации',
      body: `# Тестовая задача для Dart AI интеграции

## Описание
Эта issue создана автоматически для тестирования интеграции с Dart AI Task Manager.

## Задачи
- [ ] Проверить создание задачи в Dart AI
- [ ] Протестировать синхронизацию статуса
- [ ] Убедиться в двухсторонней связи

## Метки
- Тест интеграции
- Dart AI
- Автоматическая синхронизация

---
*Создано автоматически: ${new Date().toLocaleString('ru-RU')}*`,
      labels: ['dart-ai-sync', 'test', 'integration']
    };

    const createResponse = await axios.post(`https://api.github.com/repos/${REPO}/issues`, testIssue, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    log(`✅ Создана тестовая issue #${createResponse.data.number}`, colors.green);
    log(`🔗 URL: ${createResponse.data.html_url}`, colors.blue);

    const issueData = {
      number: createResponse.data.number,
      title: createResponse.data.title,
      body: createResponse.data.body,
      state: createResponse.data.state,
      repository: REPO,
      assignees: createResponse.data.assignees?.map(a => a.login) || [],
      labels: createResponse.data.labels?.map(l => l.name) || [],
      created_at: createResponse.data.created_at,
      updated_at: createResponse.data.updated_at,
      html_url: createResponse.data.html_url
    };

    // 4. Симулируем отправку в Dart AI
    log('\n🔄 Тест 4: Симуляция синхронизации с Dart AI', colors.blue);
    
    const dartAITask = {
      title: issueData.title,
      description: issueData.body,
      status: 'open',
      metadata: {
        source: 'github',
        github_issue_number: issueData.number,
        github_repository: issueData.repository,
        github_url: issueData.html_url,
        github_labels: issueData.labels,
        sync_timestamp: new Date().toISOString()
      }
    };

    log('📝 Данные для Dart AI:', colors.yellow);
    log(JSON.stringify(dartAITask, null, 2), colors.reset);

    // 5. Добавляем комментарий с информацией о синхронизации
    log('\n💬 Тест 5: Добавление комментария о синхронизации', colors.blue);
    
    const comment = {
      body: `🤖 **Dart AI Sync Status**

✅ **Issue готова к синхронизации с Dart AI**

**Подготовленные данные:**
- **Заголовок:** ${dartAITask.title}
- **Статус:** ${dartAITask.status}
- **Источник:** GitHub Issue #${issueData.number}
- **Метки:** ${issueData.labels.join(', ')}

**Следующие шаги:**
1. Настроить Dart AI API ключ
2. Создать Space/проект в Dart AI
3. Настроить webhook для автоматической синхронизации

---
*Синхронизация подготовлена: ${new Date().toLocaleString('ru-RU')}*`
    };

    const commentResponse = await axios.post(
      `https://api.github.com/repos/${REPO}/issues/${issueData.number}/comments`,
      comment,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    log(`✅ Добавлен комментарий к issue #${issueData.number}`, colors.green);

    // 6. Результаты
    log('\n📊 Результаты тестирования:', colors.blue);
    log('✅ GitHub API - полностью работает', colors.green);
    log('✅ Issue создана и готова к синхронизации', colors.green);
    log('⚠️  Dart AI API - требуется настройка', colors.yellow);
    
    log('\n🔧 Что нужно для полной интеграции:', colors.blue);
    log('   1. Получить Dart AI API ключ из https://app.dartai.com', colors.yellow);
    log('   2. Настроить Space/проект под репозиторий gHashTag/ai-server', colors.yellow);
    log('   3. Обновить DART_AI_API_KEY в .env файле', colors.yellow);
    log('   4. Настроить webhooks в обеих системах', colors.yellow);

    log(`\n🎯 Созданная issue для тестирования: ${issueData.html_url}`, colors.bold + colors.green);

    return {
      success: true,
      github_working: true,
      dart_ai_ready: false,
      test_issue: issueData
    };

  } catch (error) {
    log(`\n💥 Ошибка: ${error.message}`, colors.red);
    
    if (error.response) {
      log(`📋 HTTP Status: ${error.response.status}`, colors.yellow);
      log(`📋 Response: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  testRealGitHubIntegration()
    .then(result => {
      if (result.success) {
        log('\n🎉 Тест успешно завершен!', colors.bold + colors.green);
      } else {
        log('\n💥 Тест завершился с ошибкой', colors.bold + colors.red);
        process.exit(1);
      }
    })
    .catch(error => {
      log(`\n💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
      process.exit(1);
    });
}

module.exports = { testRealGitHubIntegration };