#!/usr/bin/env node

/**
 * Полный анализ ВСЕХ ботов-амбассадоров с доходами и расходами
 * Создает детальный Excel отчет по всем ботам в системе
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Функция для определения реальных платежей
function isRealPayment(payment) {
  const testMethods = ['System', 'SYSTEM', 'Manual', 'test', 'System_Balance_Migration', 'System_Operation'];
  if (testMethods.includes(payment.payment_method)) {
    return false;
  }

  const testDescriptions = [
    'Test', 'System Grant', 'System Correction', 'NEUROTESTER', 
    'simulation', 'Refund for image morphing', 'тестовых'
  ];
  if (payment.description && testDescriptions.some(test => 
    payment.description.toLowerCase().includes(test.toLowerCase())
  )) {
    return false;
  }

  if (payment.currency === 'XTR') {
    return false;
  }

  if (payment.currency === 'STARS' && payment.stars > 1000000) {
    return false;
  }
  if (payment.currency === 'RUB' && payment.amount > 100000) {
    return false;
  }

  return payment.currency === 'RUB' || payment.currency === 'STARS';
}

async function getCompleteBotsAnalysis() {
  try {
    console.log('🔍 Получаем полные данные по ВСЕМ ботам...\n');

    // 1. Получаем список всех ботов
    const { data: allBotNames, error: botsError } = await supabase
      .from('payments_v2')
      .select('bot_name')
      .not('bot_name', 'is', null);

    if (botsError) {
      console.error('❌ Ошибка получения списка ботов:', botsError.message);
      return null;
    }

    const uniqueBots = [...new Set(allBotNames.map(b => b.bot_name))].sort();
    console.log(`🤖 Найдено ${uniqueBots.length} уникальных ботов в системе:`);
    uniqueBots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot}`);
    });

    // 2. Получаем все доходы (MONEY_INCOME)
    const { data: allIncomes, error: incomeError } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_INCOME')
      .not('bot_name', 'is', null)
      .order('payment_date', { ascending: true });

    if (incomeError) {
      console.error('❌ Ошибка получения доходов:', incomeError.message);
      return null;
    }

    // 3. Получаем все расходы (MONEY_OUTCOME)
    const { data: allExpenses, error: expenseError } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_OUTCOME')
      .not('bot_name', 'is', null)
      .order('payment_date', { ascending: true });

    if (expenseError) {
      console.error('❌ Ошибка получения расходов:', expenseError.message);
      return null;
    }

    console.log(`\n📊 Статистика данных:`);
    console.log(`   Всего доходов: ${allIncomes.length}`);
    console.log(`   Всего расходов: ${allExpenses.length}`);

    // Фильтруем реальные платежи
    const realIncomes = allIncomes.filter(isRealPayment);
    const realExpenses = allExpenses.filter(isRealPayment);

    console.log(`   Реальных доходов: ${realIncomes.length}`);
    console.log(`   Реальных расходов: ${realExpenses.length}`);

    // Анализируем данные по каждому боту
    const botsAnalysis = new Map();

    // Инициализируем всех ботов
    uniqueBots.forEach(botName => {
      botsAnalysis.set(botName, {
        bot_name: botName,
        total_real_income_rub: 0,
        total_real_income_stars: 0,
        total_real_expense_rub: 0,
        total_real_expense_stars: 0,
        total_virtual_income: 0,
        total_virtual_expense: 0,
        real_income_transactions: 0,
        real_expense_transactions: 0,
        virtual_transactions: 0,
        months: new Map(),
        all_transactions: []
      });
    });

    // Обрабатываем реальные доходы
    realIncomes.forEach(payment => {
      const stats = botsAnalysis.get(payment.bot_name);
      if (!stats) return;

      if (payment.currency === 'RUB' && payment.amount > 0) {
        stats.total_real_income_rub += parseFloat(payment.amount);
        stats.real_income_transactions += 1;
      } else if (payment.currency === 'STARS' && payment.stars > 0) {
        stats.total_real_income_stars += parseFloat(payment.stars);
        stats.real_income_transactions += 1;
      }

      stats.all_transactions.push({
        ...payment,
        transaction_type: 'REAL_INCOME'
      });
    });

    // Обрабатываем реальные расходы
    realExpenses.forEach(payment => {
      const stats = botsAnalysis.get(payment.bot_name);
      if (!stats) return;

      if (payment.currency === 'RUB' && payment.amount > 0) {
        stats.total_real_expense_rub += parseFloat(payment.amount);
        stats.real_expense_transactions += 1;
      } else if (payment.currency === 'STARS' && payment.stars > 0) {
        stats.total_real_expense_stars += parseFloat(payment.stars);
        stats.real_expense_transactions += 1;
      }

      stats.all_transactions.push({
        ...payment,
        transaction_type: 'REAL_EXPENSE'
      });
    });

    // Обрабатываем виртуальные операции (для статистики)
    const virtualIncomes = allIncomes.filter(p => !isRealPayment(p));
    const virtualExpenses = allExpenses.filter(p => !isRealPayment(p));

    [...virtualIncomes, ...virtualExpenses].forEach(payment => {
      const stats = botsAnalysis.get(payment.bot_name);
      if (!stats) return;

      stats.virtual_transactions += 1;
      if (payment.type === 'MONEY_INCOME') {
        stats.total_virtual_income += parseFloat(payment.amount || payment.stars || 0);
      } else {
        stats.total_virtual_expense += parseFloat(payment.amount || payment.stars || 0);
      }

      stats.all_transactions.push({
        ...payment,
        transaction_type: payment.type === 'MONEY_INCOME' ? 'VIRTUAL_INCOME' : 'VIRTUAL_EXPENSE'
      });
    });

    return { botsAnalysis, uniqueBots };

  } catch (error) {
    console.error('❌ Ошибка анализа данных:', error);
    return null;
  }
}

function displayFullReport(botsAnalysis) {
  console.log('\n📈 ПОЛНЫЙ АНАЛИЗ ВСЕХ БОТОВ В СИСТЕМЕ');
  console.log('='.repeat(80));

  const sortedBots = Array.from(botsAnalysis.values()).sort((a, b) => {
    const aValue = a.total_real_income_rub + (a.total_real_income_stars * 0.5);
    const bValue = b.total_real_income_rub + (b.total_real_income_stars * 0.5);
    return bValue - aValue;
  });

  let totalRealIncomeRub = 0;
  let totalRealIncomeStars = 0;
  let totalRealExpenseRub = 0;
  let totalRealExpenseStars = 0;
  let botsWithIncome = 0;
  let botsWithExpense = 0;

  sortedBots.forEach((stats, index) => {
    const hasRealIncome = stats.total_real_income_rub > 0 || stats.total_real_income_stars > 0;
    const hasRealExpense = stats.total_real_expense_rub > 0 || stats.total_real_expense_stars > 0;
    const hasAnyReal = hasRealIncome || hasRealExpense;

    console.log(`\n${index + 1}. 🤖 БОТ: ${stats.bot_name}`);
    console.log('-'.repeat(50));

    if (hasAnyReal) {
      if (hasRealIncome) {
        console.log(`   💰 РЕАЛЬНЫЕ ДОХОДЫ: ${stats.total_real_income_rub.toFixed(2)} RUB | ${stats.total_real_income_stars.toFixed(2)} STARS (${stats.real_income_transactions} тр.)`);
        botsWithIncome++;
      }
      if (hasRealExpense) {
        console.log(`   💸 РЕАЛЬНЫЕ РАСХОДЫ: ${stats.total_real_expense_rub.toFixed(2)} RUB | ${stats.total_real_expense_stars.toFixed(2)} STARS (${stats.real_expense_transactions} тр.)`);
        botsWithExpense++;
      }
      
      const netRub = stats.total_real_income_rub - stats.total_real_expense_rub;
      const netStars = stats.total_real_income_stars - stats.total_real_expense_stars;
      console.log(`   📊 ЧИСТАЯ ПРИБЫЛЬ: ${netRub.toFixed(2)} RUB | ${netStars.toFixed(2)} STARS`);
    } else {
      console.log(`   🚫 НЕТ РЕАЛЬНЫХ ОПЕРАЦИЙ`);
    }

    if (stats.virtual_transactions > 0) {
      console.log(`   👻 Виртуальных операций: ${stats.virtual_transactions}`);
    }

    console.log(`   📋 Всего транзакций: ${stats.all_transactions.length}`);

    totalRealIncomeRub += stats.total_real_income_rub;
    totalRealIncomeStars += stats.total_real_income_stars;
    totalRealExpenseRub += stats.total_real_expense_rub;
    totalRealExpenseStars += stats.total_real_expense_stars;
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 ОБЩАЯ СТАТИСТИКА ПО ВСЕМ БОТАМ:');
  console.log(`🤖 Всего ботов в системе: ${sortedBots.length}`);
  console.log(`💰 Ботов с реальными доходами: ${botsWithIncome}`);
  console.log(`💸 Ботов с реальными расходами: ${botsWithExpense}`);
  console.log(`\n💵 ОБЩИЕ РЕАЛЬНЫЕ ДОХОДЫ: ${totalRealIncomeRub.toFixed(2)} RUB | ${totalRealIncomeStars.toFixed(2)} STARS`);
  console.log(`💸 ОБЩИЕ РЕАЛЬНЫЕ РАСХОДЫ: ${totalRealExpenseRub.toFixed(2)} RUB | ${totalRealExpenseStars.toFixed(2)} STARS`);
  console.log(`📊 ЧИСТАЯ ПРИБЫЛЬ: ${(totalRealIncomeRub - totalRealExpenseRub).toFixed(2)} RUB | ${(totalRealIncomeStars - totalRealExpenseStars).toFixed(2)} STARS`);
  console.log('='.repeat(80));
}

function createCompleteExcelReport(botsAnalysis) {
  try {
    console.log('\n📊 Создаем полный Excel отчет...');

    const workbook = XLSX.utils.book_new();

    // 1. Сводка по всем ботам
    const summaryData = [];
    summaryData.push([
      'БОТ', 
      'ДОХОДЫ RUB', 'ДОХОДЫ STARS', 'РАСХОДЫ RUB', 'РАСХОДЫ STARS',
      'ЧИСТАЯ ПРИБЫЛЬ RUB', 'ЧИСТАЯ ПРИБЫЛЬ STARS',
      'РЕАЛЬНЫХ ОПЕРАЦИЙ', 'ВИРТУАЛЬНЫХ ОПЕРАЦИЙ', 'ВСЕГО ОПЕРАЦИЙ'
    ]);

    const sortedBots = Array.from(botsAnalysis.values()).sort((a, b) => {
      const aValue = a.total_real_income_rub + (a.total_real_income_stars * 0.5);
      const bValue = b.total_real_income_rub + (b.total_real_income_stars * 0.5);
      return bValue - aValue;
    });

    sortedBots.forEach(stats => {
      summaryData.push([
        stats.bot_name,
        parseFloat(stats.total_real_income_rub.toFixed(2)),
        parseFloat(stats.total_real_income_stars.toFixed(2)),
        parseFloat(stats.total_real_expense_rub.toFixed(2)),
        parseFloat(stats.total_real_expense_stars.toFixed(2)),
        parseFloat((stats.total_real_income_rub - stats.total_real_expense_rub).toFixed(2)),
        parseFloat((stats.total_real_income_stars - stats.total_real_expense_stars).toFixed(2)),
        stats.real_income_transactions + stats.real_expense_transactions,
        stats.virtual_transactions,
        stats.all_transactions.length
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка по всем ботам');

    // 2. Только боты с реальными доходами
    const profitableData = [];
    profitableData.push(['БОТ', 'РЕАЛЬНЫЕ ДОХОДЫ RUB', 'РЕАЛЬНЫЕ ДОХОДЫ STARS', 'ТРАНЗАКЦИЙ', 'УСЛОВНАЯ СТОИМОСТЬ RUB']);

    const profitableBots = sortedBots.filter(bot => 
      bot.total_real_income_rub > 0 || bot.total_real_income_stars > 0
    );

    profitableBots.forEach(stats => {
      profitableData.push([
        stats.bot_name,
        parseFloat(stats.total_real_income_rub.toFixed(2)),
        parseFloat(stats.total_real_income_stars.toFixed(2)),
        stats.real_income_transactions,
        parseFloat((stats.total_real_income_rub + stats.total_real_income_stars * 0.5).toFixed(2))
      ]);
    });

    const profitableSheet = XLSX.utils.aoa_to_sheet(profitableData);
    XLSX.utils.book_append_sheet(workbook, profitableSheet, 'Прибыльные боты');

    // 3. Все реальные транзакции
    const transactionData = [];
    transactionData.push([
      'БОТ', 'ДАТА', 'ТИП', 'СУММА RUB', 'ЗВЕЗДЫ', 'ВАЛЮТА', 
      'МЕТОД ОПЛАТЫ', 'ОПИСАНИЕ', 'ПОДПИСКА', 'СТАТУС'
    ]);

    const allRealTransactions = [];
    botsAnalysis.forEach(stats => {
      stats.all_transactions
        .filter(t => t.transaction_type.includes('REAL'))
        .forEach(t => allRealTransactions.push(t));
    });

    allRealTransactions
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .forEach(payment => {
        transactionData.push([
          payment.bot_name,
          payment.payment_date,
          payment.transaction_type,
          payment.amount || 0,
          payment.stars || 0,
          payment.currency,
          payment.payment_method,
          payment.description || '',
          payment.subscription_type || '',
          payment.status
        ]);
      });

    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Все реальные транзакции');

    // Сохраняем файл
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `reports/complete-bots-analysis-${timestamp}.xlsx`;
    
    const reportsDir = path.dirname(filename);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    XLSX.writeFile(workbook, filename);
    
    console.log(`✅ Полный Excel отчет создан: ${filename}`);
    console.log(`📁 Абсолютный путь: ${path.resolve(filename)}`);
    
    return filename;

  } catch (error) {
    console.error('❌ Ошибка создания Excel отчета:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 ПОЛНЫЙ АНАЛИЗ ВСЕХ БОТОВ-АМБАССАДОРОВ В СИСТЕМЕ...\n');

  try {
    const result = await getCompleteBotsAnalysis();
    
    if (!result) {
      console.error('💥 Не удалось получить данные');
      process.exit(1);
    }

    const { botsAnalysis } = result;

    // Выводим полный отчет в консоль
    displayFullReport(botsAnalysis);

    // Создаем детальный Excel отчет
    const excelFile = createCompleteExcelReport(botsAnalysis);

    if (excelFile) {
      console.log('\n✅ Полный анализ завершен успешно!');
      console.log(`📊 Детальный Excel отчет: ${excelFile}`);
    } else {
      console.log('\n⚠️ Анализ завершен, но Excel отчет не создан');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  }
}

main();