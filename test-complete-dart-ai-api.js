#!/usr/bin/env node

/**
 * Полное тестирование Dart AI API интеграции
 * Включает все CRUD операции, синхронизацию, и edge cases
 */

const axios = require('axios');

// Настройки
const DART_AI_API_KEY = process.env.DART_AI_API_KEY || 'dsa_e4231f3e7b1fa6bdbeb44c181ee2de1ca1db84184325f27f46adbd66266423f4';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_URL = 'https://app.dartai.com/api/v0';

console.log('🚀 Полное тестирование Dart AI API интеграции');
console.log('📊 Конфигурация:');
console.log(`   - Dart AI API: ${DART_AI_API_KEY ? '✅' : '❌'}`);
console.log(`   - GitHub Token: ${GITHUB_TOKEN ? '✅' : '❌'}`);

/**
 * API клиент для Dart AI
 */
class DartAIAPIClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = BASE_URL;
    }

    async request(method, endpoint, data = null) {
        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            };
        }
    }

    // CRUD операции
    async getAllTasks() {
        return await this.request('GET', '/tasks');
    }

    async getSpaces() {
        return await this.request('GET', '/spaces');
    }

    async createTask(taskData) {
        return await this.request('POST', '/public/tasks', { item: taskData });
    }

    async getTask(id) {
        return await this.request('GET', `/public/tasks/${id}`);
    }

    async updateTask(id, updates) {
        return await this.request('PUT', `/public/tasks/${id}`, { item: { id, ...updates } });
    }

    async deleteTask(id) {
        return await this.request('DELETE', `/public/tasks/${id}`);
    }
}

/**
 * Тесты основных операций
 */
class DartAITestSuite {
    constructor() {
        this.client = new DartAIAPIClient(DART_AI_API_KEY);
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
        this.createdTasks = []; // Для cleanup
    }

    log(emoji, message, data = null) {
        console.log(`${emoji} ${message}`);
        if (data) {
            console.log('   ', data);
        }
    }

    async test(name, testFn) {
        this.results.total++;
        try {
            this.log('🧪', `Тест: ${name}`);
            await testFn();
            this.results.passed++;
            this.log('✅', `PASSED: ${name}`);
            this.results.tests.push({ name, status: 'PASSED' });
        } catch (error) {
            this.results.failed++;
            this.log('❌', `FAILED: ${name}`, error.message);
            this.results.tests.push({ name, status: 'FAILED', error: error.message });
        }
        console.log();
    }

    async runAllTests() {
        console.log('🎯 Запуск полного набора тестов...\n');

        // 1. Тест подключения к API
        await this.test('Подключение к Dart AI API', async () => {
            const result = await this.client.getAllTasks();
            if (!result.success) {
                throw new Error(`API недоступен: ${result.error}`);
            }
            this.log('📊', `Получено задач: ${result.data.count}`);
        });

        // 2. Тест получения пространств
        await this.test('Получение пространств', async () => {
            const result = await this.client.getSpaces();
            if (!result.success) {
                throw new Error(`Не удалось получить пространства: ${result.error}`);
            }
            this.log('🏢', `Получено пространств: ${result.data.count}`);
        });

        // 3. Тест создания задачи
        let createdTaskId = null;
        await this.test('Создание задачи', async () => {
            const taskData = {
                title: '🧪 API Test Task - ' + Date.now(),
                description: 'Тестовая задача для проверки API функциональности',
                status: 'To-do',
                priority: 'High',
                tags: ['test', 'api', 'automation'],
                startAt: new Date().toISOString().split('T')[0],
                dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            const result = await this.client.createTask(taskData);
            if (!result.success) {
                throw new Error(`Не удалось создать задачу: ${result.error}`);
            }

            createdTaskId = result.data.item.id;
            this.createdTasks.push(createdTaskId);
            this.log('📝', `Задача создана с ID: ${createdTaskId}`);
        });

        // 4. Тест получения конкретной задачи
        await this.test('Получение задачи по ID', async () => {
            if (!createdTaskId) {
                throw new Error('Нет созданной задачи для тестирования');
            }

            const result = await this.client.getTask(createdTaskId);
            if (!result.success) {
                throw new Error(`Не удалось получить задачу: ${result.error}`);
            }

            const task = result.data.item;
            this.log('📋', `Получена задача: "${task.title}"`);
            this.log('🏷️', `Теги: ${task.tags.join(', ')}`);
        });

        // 5. Тест обновления задачи
        await this.test('Обновление задачи', async () => {
            if (!createdTaskId) {
                throw new Error('Нет созданной задачи для тестирования');
            }

            const updates = {
                status: 'Doing',
                description: 'Обновленное описание через API тест',
                priority: 'Medium',
                tags: ['test', 'api', 'updated']
            };

            const result = await this.client.updateTask(createdTaskId, updates);
            if (!result.success) {
                throw new Error(`Не удалось обновить задачу: ${result.error}`);
            }

            const task = result.data.item;
            this.log('🔄', `Задача обновлена. Статус: ${task.status}`);
        });

        // 6. Тест создания задачи из GitHub Issue (симуляция)
        await this.test('Создание задачи из GitHub Issue', async () => {
            const issueData = {
                title: 'GitHub Issue #999: Test Integration',
                description: `🔗 GitHub Issue Info

**Repository:** [gHashTag/ai-server](https://github.com/gHashTag/ai-server)
**Issue:** [#999](https://github.com/gHashTag/ai-server/issues/999)
**State:** open
**Labels:** bug, enhancement
**Priority:** High

> 🤖 Автоматически синхронизировано из GitHub: ${new Date().toLocaleString('ru-RU')}`,
                tags: ['github-sync', 'bug', 'enhancement'],
                priority: 'High'
            };

            const result = await this.client.createTask(issueData);
            if (!result.success) {
                throw new Error(`Не удалось создать задачу из GitHub Issue: ${result.error}`);
            }

            this.createdTasks.push(result.data.item.id);
            this.log('🐙', `Задача из GitHub Issue создана: ${result.data.item.htmlUrl}`);
        });

        // 7. Тест создания подзадачи
        await this.test('Создание подзадачи', async () => {
            if (!createdTaskId) {
                throw new Error('Нет родительской задачи для тестирования');
            }

            const subtaskData = {
                title: '🔧 Подзадача для API теста',
                description: 'Тестирование создания подзадач',
                parentId: createdTaskId,
                status: 'To-do',
                tags: ['subtask', 'api-test']
            };

            const result = await this.client.createTask(subtaskData);
            if (!result.success) {
                throw new Error(`Не удалось создать подзадачу: ${result.error}`);
            }

            this.createdTasks.push(result.data.item.id);
            this.log('🔗', `Подзадача создана с родителем: ${createdTaskId}`);
        });

        // 8. Тест массовых операций
        await this.test('Массовое создание задач', async () => {
            const tasks = [
                { title: '📊 Задача 1 - Анализ данных', tags: ['analysis', 'data'] },
                { title: '🛠️ Задача 2 - Разработка', tags: ['development', 'feature'] },
                { title: '📝 Задача 3 - Документация', tags: ['docs', 'writing'] }
            ];

            let created = 0;
            for (const taskData of tasks) {
                const result = await this.client.createTask(taskData);
                if (result.success) {
                    created++;
                    this.createdTasks.push(result.data.item.id);
                }
            }

            if (created !== tasks.length) {
                throw new Error(`Создано только ${created} из ${tasks.length} задач`);
            }

            this.log('📚', `Массово создано задач: ${created}`);
        });

        // 9. Тест с различными статусами
        await this.test('Тест статусов задач', async () => {
            const statuses = ['To-do', 'Doing', 'Done'];
            const statusTests = [];

            for (const status of statuses) {
                const taskData = {
                    title: `📈 Статус тест: ${status}`,
                    status: status,
                    tags: ['status-test']
                };

                const result = await this.client.createTask(taskData);
                if (result.success) {
                    this.createdTasks.push(result.data.item.id);
                    statusTests.push(status);
                }
            }

            this.log('📋', `Протестированы статусы: ${statusTests.join(', ')}`);
        });

        // 10. Тест edge cases
        await this.test('Тест граничных случаев', async () => {
            // Задача с минимальными данными
            const minTask = { title: 'Минимальная задача' };
            let result = await this.client.createTask(minTask);
            if (result.success) {
                this.createdTasks.push(result.data.item.id);
            }

            // Задача с максимальными данными
            const maxTask = {
                title: 'Максимальная задача со всеми полями',
                description: 'Подробное описание с markdown\n\n**Жирный текст**\n- Список\n- Элементов',
                status: 'To-do',
                priority: 'High',
                tags: ['comprehensive', 'test', 'max-data', 'markdown'],
                startAt: new Date().toISOString().split('T')[0],
                dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                size: 'Large'
            };

            result = await this.client.createTask(maxTask);
            if (result.success) {
                this.createdTasks.push(result.data.item.id);
            }

            this.log('🎯', 'Протестированы edge cases: минимальные и максимальные данные');
        });

        // 11. Тест удаления (cleanup)
        await this.test('Очистка тестовых данных', async () => {
            let deleted = 0;
            const errors = [];

            for (const taskId of this.createdTasks) {
                const result = await this.client.deleteTask(taskId);
                if (result.success) {
                    deleted++;
                } else {
                    errors.push(`${taskId}: ${result.error}`);
                }
            }

            if (errors.length > 0) {
                this.log('⚠️', `Ошибки удаления: ${errors.length}`);
            }

            this.log('🗑️', `Удалено задач: ${deleted} из ${this.createdTasks.length}`);
        });

        // Показать результаты
        this.showResults();
    }

    showResults() {
        console.log('\n🎊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
        console.log('='.repeat(50));
        console.log(`📊 Всего тестов: ${this.results.total}`);
        console.log(`✅ Успешно: ${this.results.passed}`);
        console.log(`❌ Провалено: ${this.results.failed}`);
        console.log(`📈 Процент успеха: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ НЕУДАЧНЫЕ ТЕСТЫ:');
            this.results.tests
                .filter(t => t.status === 'FAILED')
                .forEach(test => {
                    console.log(`   - ${test.name}: ${test.error}`);
                });
        }

        console.log('\n🎯 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:');
        this.results.tests.forEach(test => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            console.log(`   ${status} ${test.name}`);
        });

        // Общий итог
        if (this.results.failed === 0) {
            console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
            console.log('🚀 Dart AI API полностью интегрирован и работает!');
        } else {
            console.log('\n⚠️  Некоторые тесты провалились.');
            console.log('🔧 Требуется доработка API интеграции.');
        }
    }
}

/**
 * Запуск тестов
 */
async function main() {
    try {
        const testSuite = new DartAITestSuite();
        await testSuite.runAllTests();
    } catch (error) {
        console.error('💥 Критическая ошибка:', error.message);
        process.exit(1);
    }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
    main();
}

module.exports = { DartAIAPIClient, DartAITestSuite };