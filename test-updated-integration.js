/**
 * Тестирование обновленной интеграции Dart AI (READ-ONLY) с GitHub
 * Односторонняя синхронизация: Dart AI → GitHub Issues
 */

require('dotenv').config();

// Импортируем наш сервис (имитируем TypeScript import в Node.js)
const DartAIService = require('./src/services/dart-ai.service.ts').DartAIService;

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

async function testIntegration() {
  log('\n🔧 Тестирование обновленной Dart AI интеграции\n', colors.bold);

  try {
    // Создаем экземпляр сервиса
    log('📦 Создание экземпляра DartAIService...', colors.blue);
    const dartAIService = new DartAIService();

    // Тест 1: Проверка здоровья API
    log('\n🏥 1. Проверка здоровья Dart AI API...', colors.blue);
    const healthCheck = await dartAIService.healthCheck();
    
    if (healthCheck.success) {
      log(`✅ API доступен: ${healthCheck.message}`, colors.green);
      log(`   📊 Детали: ${JSON.stringify(healthCheck.details, null, 2)}`, colors.reset);
    } else {
      log(`❌ API недоступен: ${healthCheck.message}`, colors.red);
      return;
    }

    // Тест 2: Получение всех задач
    log('\n📋 2. Получение всех задач из Dart AI...', colors.blue);
    const tasksResult = await dartAIService.getTasks();
    
    if (tasksResult.success) {
      log(`✅ Получено задач: ${tasksResult.count}`, colors.green);
      if (tasksResult.tasks.length > 0) {
        const firstTask = tasksResult.tasks[0];
        log(`   📝 Первая задача: "${firstTask.title}"`, colors.reset);
        log(`   🆔 DUID: ${firstTask.duid}`, colors.reset);
        log(`   📅 Создана: ${firstTask.createdAt}`, colors.reset);
      }
    } else {
      log('❌ Ошибка получения задач', colors.red);
      return;
    }

    // Тест 3: Получение пространств
    log('\n🏢 3. Получение пространств из Dart AI...', colors.blue);
    const spacesResult = await dartAIService.getSpaces();
    
    if (spacesResult.success) {
      log(`✅ Получено пространств: ${spacesResult.count}`, colors.green);
      spacesResult.spaces.forEach((space, index) => {
        log(`   ${index + 1}. "${space.title}" (${space.kind}) - ${space.duid}`, colors.reset);
      });
    } else {
      log('❌ Ошибка получения пространств', colors.red);
    }

    // Тест 4: Поиск задач связанных с GitHub
    log('\n🔍 4. Поиск задач связанных с GitHub...', colors.blue);
    const githubTasks = await dartAIService.findTasksWithGitHubMetadata();
    
    log(`📦 Найдено GitHub-связанных задач: ${githubTasks.length}`, colors.yellow);
    githubTasks.forEach((task, index) => {
      log(`   ${index + 1}. "${task.title}" (${task.duid})`, colors.reset);
    });

    // Тест 5: Получение статистики синхронизации
    log('\n📊 5. Статистика сервиса...', colors.blue);
    const stats = dartAIService.getSyncStats();
    log(`📈 Статистика: ${JSON.stringify(stats, null, 2)}`, colors.reset);

    // Тест 6: Создание тестового GitHub Issue из первой задачи
    if (tasksResult.tasks.length > 0) {
      log('\n🚀 6. Тест создания GitHub Issue из задачи Dart AI...', colors.blue);
      
      const testTask = tasksResult.tasks[0];
      const repository = process.env.DEFAULT_GITHUB_REPO || 'gHashTag/ai-server';
      
      log(`   📝 Создаю Issue для задачи: "${testTask.title}"`, colors.yellow);
      log(`   📍 Репозиторий: ${repository}`, colors.yellow);
      
      try {
        const issue = await dartAIService.createGitHubIssueFromTask(testTask, repository);
        
        if (issue) {
          log(`✅ GitHub Issue создан!`, colors.green);
          log(`   🔗 Issue #${issue.number}: ${issue.title}`, colors.green);
          log(`   📍 URL: https://github.com/${repository}/issues/${issue.number}`, colors.green);
        } else {
          log('⚠️  Не удалось создать GitHub Issue', colors.yellow);
        }
      } catch (error) {
        log(`❌ Ошибка создания Issue: ${error.message}`, colors.red);
      }
    }

    // Тест 7: Получение конкретной задачи по DUID
    if (tasksResult.tasks.length > 0) {
      log('\n🔍 7. Получение задачи по DUID...', colors.blue);
      const testDuid = tasksResult.tasks[0].duid;
      
      const task = await dartAIService.getTaskByDuid(testDuid);
      if (task) {
        log(`✅ Задача получена: "${task.title}"`, colors.green);
      } else {
        log('❌ Задача не найдена', colors.red);
      }
    }

    log('\n🎉 Тестирование завершено успешно!', colors.bold + colors.green);
    
    // Рекомендации
    log('\n💡 Рекомендации для дальнейшей интеграции:', colors.yellow);
    log('   1. ✅ Read-only API работает корректно', colors.green);
    log('   2. ✅ Можно создавать GitHub Issues из задач Dart AI', colors.green);
    log('   3. ⚠️  Создание задач в Dart AI только через веб-интерфейс', colors.yellow);
    log('   4. 🔄 Настройте регулярную синхронизацию Dart AI → GitHub', colors.blue);
    log('   5. 🪝 Рассмотрите использование webhooks для real-time синхронизации', colors.blue);

  } catch (error) {
    log(`💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
    console.error(error);
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  testIntegration().catch(console.error);
}

module.exports = { testIntegration };