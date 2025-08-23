#!/usr/bin/env node

/**
 * Тест полной двухсторонней синхронизации GitHub ↔ Dart AI
 * С реальным API POST /api/v0/public/tasks
 */

const axios = require('axios');

// Настройки
const DART_AI_API_KEY = process.env.DART_AI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!DART_AI_API_KEY) {
    console.log('❌ DART_AI_API_KEY не установлен в .env');
    process.exit(1);
}

console.log('🚀 Тестирование полной двухсторонней синхронизации');
console.log('🔧 API ключи настроены');

/**
 * Создание задачи в Dart AI
 */
async function createDartAITask(issueData) {
    try {
        console.log('\n📝 Создаю задачу в Dart AI...');
        
        const taskData = {
            item: {
                title: `GitHub Issue #${issueData.number}: ${issueData.title}`,
                description: `${issueData.body || 'Без описания'}

---
## 🔗 GitHub Issue Info

**Repository:** [${issueData.repository}](https://github.com/${issueData.repository})  
**Issue:** [#${issueData.number}](https://github.com/${issueData.repository}/issues/${issueData.number})  
**State:** ${issueData.state}  
**Labels:** ${issueData.labels?.join(', ') || 'нет'}  
**Assignees:** ${issueData.assignees?.join(', ') || 'нет'}  

> 🤖 *Автоматически синхронизировано из GitHub: ${new Date().toLocaleString('ru-RU')}*`,
                tags: [...(issueData.labels || []), 'github-sync']
            }
        };

        const response = await axios.post(
            'https://app.dartai.com/api/v0/public/tasks',
            taskData,
            {
                headers: {
                    'Authorization': `Bearer ${DART_AI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const createdTask = response.data.item;
        
        console.log('✅ Задача создана в Dart AI!');
        console.log('📊 Результат:', {
            id: createdTask.id,
            title: createdTask.title,
            status: createdTask.status,
            dartboard: createdTask.dartboard,
            url: createdTask.htmlUrl,
            tags: createdTask.tags
        });

        return createdTask;

    } catch (error) {
        console.log('❌ Ошибка создания задачи в Dart AI:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        return null;
    }
}

/**
 * Создание GitHub Issue
 */
async function createGitHubIssue(repository, taskData) {
    if (!GITHUB_TOKEN) {
        console.log('⚠️ GITHUB_TOKEN не установлен - пропускаю создание Issue');
        return null;
    }

    try {
        console.log('\n📝 Создаю GitHub Issue...');

        const issueData = {
            title: `Dart AI Task: ${taskData.title}`,
            body: `${taskData.description || 'Без описания'}

---
## 🎯 Dart AI Task Info

**Task ID:** [${taskData.id}](${taskData.htmlUrl})  
**Dartboard:** ${taskData.dartboard}  
**Status:** ${taskData.status}  
**Type:** ${taskData.type}  

> 🔗 *Синхронизировано из Dart AI: ${new Date().toLocaleString('ru-RU')}*`,
            labels: ['dart-ai-sync', ...(taskData.tags || [])]
        };

        const response = await axios.post(
            `https://api.github.com/repos/${repository}/issues`,
            issueData,
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ GitHub Issue создан!');
        console.log('📊 Результат:', {
            number: response.data.number,
            title: response.data.title,
            state: response.data.state,
            url: response.data.html_url,
            labels: response.data.labels?.map(l => l.name) || []
        });

        return response.data;

    } catch (error) {
        console.log('❌ Ошибка создания GitHub Issue:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        return null;
    }
}

/**
 * Основная функция тестирования
 */
async function runBidirectionalTest() {
    console.log('\n=== ТЕСТ 1: GitHub → Dart AI ===');
    
    // Симулируем GitHub Issue
    const mockGitHubIssue = {
        number: Math.floor(Math.random() * 1000) + 100,
        title: '🔄 Тест двухсторонней синхронизации',
        body: 'Это тестовый issue для проверки синхронизации GitHub → Dart AI через реальный API',
        state: 'open',
        repository: 'gHashTag/ai-server',
        labels: ['test', 'integration', 'api'],
        assignees: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    console.log('📄 Mock GitHub Issue:', {
        number: mockGitHubIssue.number,
        title: mockGitHubIssue.title,
        repository: mockGitHubIssue.repository,
        labels: mockGitHubIssue.labels
    });

    // Создаем задачу в Dart AI из GitHub Issue
    const dartTask = await createDartAITask(mockGitHubIssue);
    
    if (!dartTask) {
        console.log('❌ Тест GitHub → Dart AI провалился');
        return;
    }

    console.log('\n=== ТЕСТ 2: Dart AI → GitHub ===');
    
    // Создаем GitHub Issue из задачи Dart AI
    const githubIssue = await createGitHubIssue('gHashTag/ai-server', dartTask);
    
    if (githubIssue) {
        console.log('✅ Полная двухсторонняя синхронизация работает!');
        console.log('\n🎉 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
        console.log('✅ GitHub → Dart AI: УСПЕШНО');
        console.log('✅ Dart AI → GitHub: УСПЕШНО');
        console.log('\n🔗 Созданные объекты:');
        console.log(`📋 Dart AI Task: ${dartTask.htmlUrl}`);
        console.log(`🐙 GitHub Issue: ${githubIssue.html_url}`);
    } else {
        console.log('⚠️ GitHub → Dart AI работает, но GitHub Issue создать не удалось');
        console.log('(Возможно нет прав доступа к репозиторию)');
        console.log('\n📋 Dart AI Task создан: ' + dartTask.htmlUrl);
    }
}

/**
 * Тест статуса API
 */
async function testAPIStatus() {
    console.log('\n=== ПРОВЕРКА СТАТУСА API ===');

    try {
        // Тест Dart AI API
        const dartResponse = await axios.get('https://app.dartai.com/api/v0/tasks', {
            headers: { 'Authorization': `Bearer ${DART_AI_API_KEY}` }
        });

        console.log('✅ Dart AI API доступен:', {
            tasks_count: dartResponse.data.count,
            status: dartResponse.status
        });

        if (GITHUB_TOKEN) {
            // Тест GitHub API
            const githubResponse = await axios.get('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
            });

            console.log('✅ GitHub API доступен:', {
                user: githubResponse.data.login,
                status: githubResponse.status
            });
        } else {
            console.log('⚠️ GitHub API не тестируется (нет токена)');
        }

    } catch (error) {
        console.log('❌ Ошибка проверки API:', error.message);
    }
}

// Запуск тестов
async function main() {
    try {
        await testAPIStatus();
        await runBidirectionalTest();
        
        console.log('\n🏁 Тестирование завершено!');
    } catch (error) {
        console.error('💥 Общая ошибка:', error.message);
    }
}

main();