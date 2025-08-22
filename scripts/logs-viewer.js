#!/usr/bin/env node

/**
 * Умный просмотрщик логов с фильтрацией шума
 * Usage: node scripts/logs-viewer.js [filter]
 * Examples:
 *   node scripts/logs-viewer.js                  # все важные логи
 *   node scripts/logs-viewer.js error           # только ошибки
 *   node scripts/logs-viewer.js api             # только API запросы
 *   node scripts/logs-viewer.js inngest         # только Inngest события
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

const filter = process.argv[2] || 'important';

// Словарь фильтров
const filters = {
  important: [
    'ERROR',
    'WARN', 
    'POST /api/',
    'PUT /api/',
    'DELETE /api/',
    '🚀',
    '📋',
    '🔧',
    'listening',
    'started',
    'error',
    'Error',
    'Failed',
    'Success'
  ],
  
  error: ['ERROR', 'error', 'Error', 'Failed', 'failed'],
  
  api: ['POST /api/', 'GET /api/', 'PUT /api/', 'DELETE /api/'],
  
  inngest: ['inngest', 'Inngest', 'function', 'event'],
  
  minimal: ['ERROR', '🚀', 'listening', 'started'],
  
  all: [] // показать все
};

function getFilterPattern(filterName) {
  const filterList = filters[filterName] || filters.important;
  if (filterList.length === 0) return '';
  return filterList.join('|');
}

function startLogViewer(filterName) {
  const pattern = getFilterPattern(filterName);
  
  console.log(chalk.blue('📋 AI Server Logs Viewer'));
  console.log(chalk.gray(`Filter: ${filterName}`));
  console.log(chalk.gray(`Pattern: ${pattern || 'все логи'}`));
  console.log(chalk.gray('=====================================\n'));

  let command, args;
  
  if (pattern) {
    // С фильтрацией
    command = 'pm2';
    args = ['logs', '--raw', '--lines', '100'];
  } else {
    // Без фильтрации  
    command = 'pm2';
    args = ['logs', '--raw', '--lines', '100'];
  }

  const pm2Process = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'inherit']
  });

  let grepProcess;
  if (pattern) {
    grepProcess = spawn('grep', ['-E', pattern, '--color=always'], {
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    pm2Process.stdout.pipe(grepProcess.stdin);
  } else {
    pm2Process.stdout.pipe(process.stdout);
  }

  pm2Process.on('error', (err) => {
    console.error(chalk.red('Ошибка запуска pm2:'), err.message);
  });

  if (grepProcess) {
    grepProcess.on('error', (err) => {
      console.error(chalk.red('Ошибка фильтрации:'), err.message);
    });
  }

  // Обработка Ctrl+C
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Завершение просмотра логов...'));
    if (grepProcess) grepProcess.kill();
    pm2Process.kill();
    process.exit(0);
  });
}

// Показать справку
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(chalk.blue('AI Server Logs Viewer'));
  console.log(chalk.gray('Умный просмотрщик логов с фильтрацией\n'));
  
  console.log(chalk.white('Использование:'));
  console.log('  node scripts/logs-viewer.js [filter]\n');
  
  console.log(chalk.white('Доступные фильтры:'));
  Object.keys(filters).forEach(key => {
    console.log(chalk.cyan(`  ${key.padEnd(12)}`), chalk.gray(`- ${filters[key].slice(0, 3).join(', ')}${filters[key].length > 3 ? '...' : ''}`));
  });
  
  console.log(chalk.white('\nПримеры:'));
  console.log('  node scripts/logs-viewer.js              # важные логи');
  console.log('  node scripts/logs-viewer.js error        # только ошибки');
  console.log('  node scripts/logs-viewer.js api          # API запросы');
  console.log('  node scripts/logs-viewer.js minimal      # минимум логов');
  
  process.exit(0);
}

startLogViewer(filter);