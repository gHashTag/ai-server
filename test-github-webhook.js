#!/usr/bin/env node

/**
 * Тест обработки GitHub webhook для создания задач в Dart AI
 * Симулирует создание issue в GitHub и его отправку в Dart AI
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Настройки
const DART_AI_API_KEY = process.env.DART_AI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORT = 3001;

console.log('🔧 Настройка GitHub Webhook тестирования...');
console.log(`📊 Dart AI API Key: ${DART_AI_API_KEY ? '✅ Установлен' : '❌ Отсутствует'}`);
console.log(`🔑 GitHub Token: ${GITHUB_TOKEN ? '✅ Установлен' : '❌ Отсутствует'}`);

/**
 * Симуляция создания задачи в Dart AI из GitHub Issue
 * Поскольку API Dart AI только для чтения, логируем что бы делали
 */
async function simulateCreateDartTask(issueData) {
    console.log('\n📝 Симуляция создания задачи в Dart AI:');
    console.log({
        title: issueData.title,
        description: issueData.body || 'Описание отсутствует',
        labels: issueData.labels?.map(l => l.name) || [],
        assignees: issueData.assignees?.map(a => a.login) || [],
        github_issue_url: issueData.html_url,
        github_issue_number: issueData.number,
        status: 'open'
    });
    
    // В реальности здесь бы был запрос к API Dart AI
    // Но API только для чтения, поэтому возвращаем mock
    return {
        id: `dart_task_${Date.now()}`,
        title: issueData.title,
        status: 'created_from_github',
        github_sync: true
    };
}

/**
 * Обработчик GitHub webhook для issues
 */
app.post('/webhook/github', async (req, res) => {
    try {
        const { action, issue, repository } = req.body;
        
        console.log(`\n🎯 GitHub Webhook получен: ${action} для issue #${issue?.number}`);
        
        if (action === 'opened' || action === 'edited') {
            // Симулируем создание/обновление задачи в Dart AI
            const dartTask = await simulateCreateDartTask(issue);
            
            console.log('✅ Задача синхронизирована в Dart AI:', dartTask);
            
            // Здесь можно добавить комментарий к GitHub issue со ссылкой на Dart AI
            console.log('💬 Можно добавить комментарий в GitHub issue со ссылкой на Dart AI задачу');
            
            res.json({ success: true, dartTask });
        } else {
            console.log(`ℹ️  Действие ${action} не обрабатывается`);
            res.json({ success: true, message: 'Action not handled' });
        }
        
    } catch (error) {
        console.error('❌ Ошибка обработки webhook:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Тестовый endpoint для симуляции GitHub issue
 */
app.post('/test/create-issue', async (req, res) => {
    const testIssue = {
        number: Math.floor(Math.random() * 1000) + 100,
        title: req.body.title || 'Тестовая задача из GitHub',
        body: req.body.body || 'Описание тестовой задачи',
        html_url: `https://github.com/test/repo/issues/${Math.floor(Math.random() * 1000)}`,
        labels: req.body.labels || [],
        assignees: req.body.assignees || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    console.log('\n🧪 Создание тестового GitHub issue...');
    
    // Симулируем отправку webhook
    const webhookPayload = {
        action: 'opened',
        issue: testIssue,
        repository: {
            name: 'ai-server',
            full_name: 'gHashTag/ai-server'
        }
    };
    
    try {
        const response = await axios.post(
            `http://localhost:${PORT}/webhook/github`,
            webhookPayload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        
        res.json({
            success: true,
            testIssue,
            webhookResponse: response.data
        });
        
    } catch (error) {
        console.error('❌ Ошибка теста:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Проверка статуса интеграции
 */
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        dartAI: DART_AI_API_KEY ? 'configured' : 'not_configured',
        github: GITHUB_TOKEN ? 'configured' : 'not_configured',
        endpoints: [
            'POST /webhook/github - GitHub webhook handler',
            'POST /test/create-issue - Test issue creation',
            'GET /status - This status endpoint'
        ]
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 Доступные endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/status`);
    console.log(`   POST http://localhost:${PORT}/webhook/github`);
    console.log(`   POST http://localhost:${PORT}/test/create-issue`);
    console.log(`\n🧪 Для тестирования выполните:`);
    console.log(`   curl -X POST http://localhost:${PORT}/test/create-issue -H "Content-Type: application/json" -d '{"title": "Тест из curl"}'`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Завершение работы сервера...');
    process.exit(0);
});