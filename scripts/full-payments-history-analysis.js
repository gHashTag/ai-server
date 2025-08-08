#!/usr/bin/env node

/**
 * ПОЛНЫЙ АНАЛИЗ ВСЕХ ПЛАТЕЖЕЙ ЗА ВСЮ ИСТОРИЮ
 * Все приходы (MONEY_INCOME) и расходы (MONEY_OUTCOME) 
 * Реальные и виртуальные по ботам и месяцам
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

async function getAllPaymentsHistory() {
  try {
    console.log('🔍 Получаем ВСЕ платежи за всю историю...\n');

    // Получаем ВСЕ платежи (приходы и расходы)
    const { data: allPayments, error } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .in('type', ['MONEY_INCOME', 'MONEY_OUTCOME'])
      .not('bot_name', 'is', null)
      .order('payment_date', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения данных:', error.message);
      return null;
    }

    console.log(`📊 Всего получено платежей: ${allPayments.length}`);

    // Анализируем данные
    const result = analyzeAllPayments(allPayments);
    return result;

  } catch (error) {
    console.error('❌ Ошибка анализа данных:', error);
    return null;
  }
}

function analyzeAllPayments(payments) {
  const botStats = new Map();
  const monthlyStats = new Map();
  const allTransactions = [];

  console.log('\n📈 Анализируем платежи...');

  payments.forEach(payment => {
    const date = new Date(payment.payment_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    const botName = payment.bot_name;

    // Определяем тип платежа
    const isReal = isRealPayment(payment);
    const paymentType = `${payment.type}_${isReal ? 'REAL' : 'VIRTUAL'}`;

    // Инициализация бота
    if (!botStats.has(botName)) {
      botStats.set(botName, {
        bot_name: botName,
        total_income_real_rub: 0,
        total_income_real_stars: 0,
        total_income_virtual: 0,
        total_expense_real_rub: 0,
        total_expense_real_stars: 0,
        total_expense_virtual: 0,
        transactions_count: 0,
        months: new Map()
      });
    }

    // Инициализация месяца для бота
    const stats = botStats.get(botName);
    if (!stats.months.has(monthKey)) {
      stats.months.set(monthKey, {
        month: monthKey,
        income_real_rub: 0,
        income_real_stars: 0,
        income_virtual: 0,
        expense_real_rub: 0,
        expense_real_stars: 0,
        expense_virtual: 0,
        transactions: 0
      });
    }

    const monthStats = stats.months.get(monthKey);

    // Инициализация общей статистики по месяцам
    if (!monthlyStats.has(monthKey)) {
      monthlyStats.set(monthKey, {
        month: monthKey,
        total_income_real_rub: 0,
        total_income_real_stars: 0,
        total_income_virtual: 0,
        total_expense_real_rub: 0,
        total_expense_real_stars: 0,
        total_expense_virtual: 0,
        bots_count: new Set(),
        transactions_count: 0
      });
    }

    const globalMonth = monthlyStats.get(monthKey);

    // Обновляем статистику
    const amount = parseFloat(payment.amount || 0);
    const stars = parseFloat(payment.stars || 0);

    if (payment.type === 'MONEY_INCOME') {
      if (isReal) {
        if (payment.currency === 'RUB' && amount > 0) {
          stats.total_income_real_rub += amount;
          monthStats.income_real_rub += amount;
          globalMonth.total_income_real_rub += amount;
        } else if (payment.currency === 'STARS' && stars > 0) {
          stats.total_income_real_stars += stars;
          monthStats.income_real_stars += stars;
          globalMonth.total_income_real_stars += stars;
        }
      } else {
        const virtualValue = amount || stars || 0;
        stats.total_income_virtual += virtualValue;
        monthStats.income_virtual += virtualValue;
        globalMonth.total_income_virtual += virtualValue;
      }
    } else if (payment.type === 'MONEY_OUTCOME') {
      if (isReal) {
        if (payment.currency === 'RUB' && amount > 0) {
          stats.total_expense_real_rub += amount;
          monthStats.expense_real_rub += amount;
          globalMonth.total_expense_real_rub += amount;
        } else if (payment.currency === 'STARS' && stars > 0) {
          stats.total_expense_real_stars += stars;
          monthStats.expense_real_stars += stars;
          globalMonth.total_expense_real_stars += stars;
        }
      } else {
        const virtualValue = amount || stars || 0;
        stats.total_expense_virtual += virtualValue;
        monthStats.expense_virtual += virtualValue;
        globalMonth.total_expense_virtual += virtualValue;
      }
    }

    stats.transactions_count += 1;
    monthStats.transactions += 1;
    globalMonth.transactions_count += 1;
    globalMonth.bots_count.add(botName);

    // Добавляем в детальные транзакции
    allTransactions.push({
      bot_name: botName,
      payment_date: payment.payment_date,
      month: monthKey,
      type: payment.type,
      is_real: isReal,
      payment_type: paymentType,
      amount: amount,
      stars: stars,
      currency: payment.currency,
      payment_method: payment.payment_method,
      description: payment.description || '',
      subscription_type: payment.subscription_type || ''
    });
  });

  // Конвертируем Set в count для ботов
  monthlyStats.forEach(month => {
    month.bots_count = month.bots_count.size;
  });

  return { botStats, monthlyStats, allTransactions };
}

function isRealPayment(payment) {
  // Тестовые методы оплаты
  const testMethods = ['System', 'SYSTEM', 'Manual', 'test', 'System_Balance_Migration', 'System_Operation'];
  if (testMethods.includes(payment.payment_method)) {
    return false;
  }

  // Тестовые описания
  const testDescriptions = [
    'Test', 'System Grant', 'System Correction', 'NEUROTESTER', 
    'simulation', 'Refund for image morphing', 'тестовых'
  ];
  if (payment.description && testDescriptions.some(test => 
    payment.description.toLowerCase().includes(test.toLowerCase())
  )) {
    return false;
  }

  // Виртуальная валюта
  if (payment.currency === 'XTR') {
    return false;
  }

  // Аномально большие суммы
  if (payment.currency === 'STARS' && payment.stars > 1000000) {
    return false;
  }
  if (payment.currency === 'RUB' && payment.amount > 100000) {
    return false;
  }

  return payment.currency === 'RUB' || payment.currency === 'STARS';
}

function displayFullHistoryReport(botStats, monthlyStats) {
  console.log('\n📈 ПОЛНАЯ ИСТОРИЯ ВСЕХ ПЛАТЕЖЕЙ ПО БОТАМ');
  console.log('='.repeat(100));

  // Статистика по месяцам
  console.log('\n📅 СТАТИСТИКА ПО МЕСЯЦАМ:');
  console.log('-'.repeat(100));
  
  const sortedMonths = Array.from(monthlyStats.values()).sort((a, b) => a.month.localeCompare(b.month));
  
  sortedMonths.forEach(month => {
    console.log(`\n📆 ${month.month}:`);
    console.log(`   💰 ДОХОДЫ - Реальные: ${month.total_income_real_rub.toFixed(2)} RUB | ${month.total_income_real_stars.toFixed(0)} STARS | Виртуальные: ${month.total_income_virtual.toFixed(0)}`);
    console.log(`   💸 РАСХОДЫ - Реальные: ${month.total_expense_real_rub.toFixed(2)} RUB | ${month.total_expense_real_stars.toFixed(0)} STARS | Виртуальные: ${month.total_expense_virtual.toFixed(0)}`);
    console.log(`   🤖 Ботов: ${month.bots_count} | 📋 Транзакций: ${month.transactions_count}`);
  });

  // Статистика по ботам
  console.log('\n🤖 СТАТИСТИКА ПО БОТАМ:');
  console.log('-'.repeat(100));

  const sortedBots = Array.from(botStats.values()).sort((a, b) => {
    const aTotal = a.total_income_real_rub + (a.total_income_real_stars * 0.5);
    const bTotal = b.total_income_real_rub + (b.total_income_real_stars * 0.5);
    return bTotal - aTotal;
  });

  sortedBots.forEach((stats, index) => {
    console.log(`\n${index + 1}. 🤖 ${stats.bot_name}`);
    console.log(`   💰 ДОХОДЫ: ${stats.total_income_real_rub.toFixed(2)} RUB | ${stats.total_income_real_stars.toFixed(0)} STARS | Виртуальные: ${stats.total_income_virtual.toFixed(0)}`);
    console.log(`   💸 РАСХОДЫ: ${stats.total_expense_real_rub.toFixed(2)} RUB | ${stats.total_expense_real_stars.toFixed(0)} STARS | Виртуальные: ${stats.total_expense_virtual.toFixed(0)}`);
    console.log(`   📊 ЧИСТАЯ ПРИБЫЛЬ: ${(stats.total_income_real_rub - stats.total_expense_real_rub).toFixed(2)} RUB | ${(stats.total_income_real_stars - stats.total_expense_real_stars).toFixed(0)} STARS`);
    console.log(`   📋 Всего транзакций: ${stats.transactions_count} | Месяцев активности: ${stats.months.size}`);
  });

  // Общие итоги
  const totalIncomeRealRub = sortedBots.reduce((sum, bot) => sum + bot.total_income_real_rub, 0);
  const totalIncomeRealStars = sortedBots.reduce((sum, bot) => sum + bot.total_income_real_stars, 0);
  const totalIncomeVirtual = sortedBots.reduce((sum, bot) => sum + bot.total_income_virtual, 0);
  const totalExpenseRealRub = sortedBots.reduce((sum, bot) => sum + bot.total_expense_real_rub, 0);
  const totalExpenseRealStars = sortedBots.reduce((sum, bot) => sum + bot.total_expense_real_stars, 0);
  const totalExpenseVirtual = sortedBots.reduce((sum, bot) => sum + bot.total_expense_virtual, 0);
  const totalTransactions = sortedBots.reduce((sum, bot) => sum + bot.transactions_count, 0);

  console.log('\n' + '='.repeat(100));
  console.log('📊 ОБЩИЕ ИТОГИ ЗА ВСЮ ИСТОРИЮ:');
  console.log(`🤖 Всего ботов: ${sortedBots.length}`);
  console.log(`📋 Всего транзакций: ${totalTransactions}`);
  console.log(`📅 Периодов активности: ${sortedMonths.length} месяцев`);
  console.log('\n💰 ОБЩИЕ ДОХОДЫ:');
  console.log(`   Реальные: ${totalIncomeRealRub.toFixed(2)} RUB | ${totalIncomeRealStars.toFixed(0)} STARS`);
  console.log(`   Виртуальные: ${totalIncomeVirtual.toFixed(0)} единиц`);
  console.log('\n💸 ОБЩИЕ РАСХОДЫ:');
  console.log(`   Реальные: ${totalExpenseRealRub.toFixed(2)} RUB | ${totalExpenseRealStars.toFixed(0)} STARS`);
  console.log(`   Виртуальные: ${totalExpenseVirtual.toFixed(0)} единиц`);
  console.log('\n📊 ЧИСТАЯ ПРИБЫЛЬ:');
  console.log(`   ${(totalIncomeRealRub - totalExpenseRealRub).toFixed(2)} RUB | ${(totalIncomeRealStars - totalExpenseRealStars).toFixed(0)} STARS`);
  console.log('='.repeat(100));
}

function createFullHistoryExcel(botStats, monthlyStats, allTransactions) {
  try {
    console.log('\n📊 Создаем полный Excel отчет...');

    const workbook = XLSX.utils.book_new();

    // 1. Сводка по месяцам
    const monthlyData = [];
    monthlyData.push([
      'МЕСЯЦ', 
      'ДОХОДЫ РЕАЛЬНЫЕ RUB', 'ДОХОДЫ РЕАЛЬНЫЕ STARS', 'ДОХОДЫ ВИРТУАЛЬНЫЕ',
      'РАСХОДЫ РЕАЛЬНЫЕ RUB', 'РАСХОДЫ РЕАЛЬНЫЕ STARS', 'РАСХОДЫ ВИРТУАЛЬНЫЕ',
      'БОТОВ АКТИВНЫХ', 'ТРАНЗАКЦИЙ'
    ]);

    const sortedMonths = Array.from(monthlyStats.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    sortedMonths.forEach(month => {
      monthlyData.push([
        month.month,
        parseFloat(month.total_income_real_rub.toFixed(2)),
        parseFloat(month.total_income_real_stars.toFixed(0)),
        parseFloat(month.total_income_virtual.toFixed(0)),
        parseFloat(month.total_expense_real_rub.toFixed(2)),
        parseFloat(month.total_expense_real_stars.toFixed(0)),
        parseFloat(month.total_expense_virtual.toFixed(0)),
        month.bots_count,
        month.transactions_count
      ]);
    });

    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'По месяцам');

    // 2. Сводка по ботам
    const botsData = [];
    botsData.push([
      'БОТ',
      'ДОХОДЫ РЕАЛЬНЫЕ RUB', 'ДОХОДЫ РЕАЛЬНЫЕ STARS', 'ДОХОДЫ ВИРТУАЛЬНЫЕ',
      'РАСХОДЫ РЕАЛЬНЫЕ RUB', 'РАСХОДЫ РЕАЛЬНЫЕ STARS', 'РАСХОДЫ ВИРТУАЛЬНЫЕ',
      'ЧИСТАЯ ПРИБЫЛЬ RUB', 'ЧИСТАЯ ПРИБЫЛЬ STARS',
      'ВСЕГО ТРАНЗАКЦИЙ', 'МЕСЯЦЕВ АКТИВНОСТИ'
    ]);

    const sortedBots = Array.from(botStats.values()).sort((a, b) => {
      const aTotal = a.total_income_real_rub + (a.total_income_real_stars * 0.5);
      const bTotal = b.total_income_real_rub + (b.total_income_real_stars * 0.5);
      return bTotal - aTotal;
    });

    sortedBots.forEach(stats => {
      botsData.push([
        stats.bot_name,
        parseFloat(stats.total_income_real_rub.toFixed(2)),
        parseFloat(stats.total_income_real_stars.toFixed(0)),
        parseFloat(stats.total_income_virtual.toFixed(0)),
        parseFloat(stats.total_expense_real_rub.toFixed(2)),
        parseFloat(stats.total_expense_real_stars.toFixed(0)),
        parseFloat(stats.total_expense_virtual.toFixed(0)),
        parseFloat((stats.total_income_real_rub - stats.total_expense_real_rub).toFixed(2)),
        parseFloat((stats.total_income_real_stars - stats.total_expense_real_stars).toFixed(0)),
        stats.transactions_count,
        stats.months.size
      ]);
    });

    const botsSheet = XLSX.utils.aoa_to_sheet(botsData);
    XLSX.utils.book_append_sheet(workbook, botsSheet, 'По ботам');

    // 3. Детализация по ботам и месяцам
    const detailData = [];
    detailData.push([
      'БОТ', 'МЕСЯЦ',
      'ДОХОДЫ РЕАЛЬНЫЕ RUB', 'ДОХОДЫ РЕАЛЬНЫЕ STARS', 'ДОХОДЫ ВИРТУАЛЬНЫЕ',
      'РАСХОДЫ РЕАЛЬНЫЕ RUB', 'РАСХОДЫ РЕАЛЬНЫЕ STARS', 'РАСХОДЫ ВИРТУАЛЬНЫЕ',
      'ТРАНЗАКЦИЙ'
    ]);

    sortedBots.forEach(botStats => {
      const sortedBotMonths = Array.from(botStats.months.values()).sort((a, b) => a.month.localeCompare(b.month));
      sortedBotMonths.forEach(month => {
        detailData.push([
          botStats.bot_name,
          month.month,
          parseFloat(month.income_real_rub.toFixed(2)),
          parseFloat(month.income_real_stars.toFixed(0)),
          parseFloat(month.income_virtual.toFixed(0)),
          parseFloat(month.expense_real_rub.toFixed(2)),
          parseFloat(month.expense_real_stars.toFixed(0)),
          parseFloat(month.expense_virtual.toFixed(0)),
          month.transactions
        ]);
      });
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Детализация');

    // 4. Все транзакции
    const transData = [];
    transData.push([
      'БОТ', 'ДАТА', 'МЕСЯЦ', 'ТИП', 'РЕАЛЬНЫЙ/ВИРТУАЛЬНЫЙ',
      'СУММА RUB', 'ЗВЕЗДЫ', 'ВАЛЮТА', 'МЕТОД ОПЛАТЫ', 'ОПИСАНИЕ', 'ПОДПИСКА'
    ]);

    allTransactions
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .forEach(t => {
        transData.push([
          t.bot_name,
          t.payment_date,
          t.month,
          t.type,
          t.is_real ? 'РЕАЛЬНЫЙ' : 'ВИРТУАЛЬНЫЙ',
          t.amount,
          t.stars,
          t.currency,
          t.payment_method,
          t.description,
          t.subscription_type
        ]);
      });

    const transSheet = XLSX.utils.aoa_to_sheet(transData);
    XLSX.utils.book_append_sheet(workbook, transSheet, 'Все транзакции');

    // Сохраняем файл
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `reports/full-payments-history-${timestamp}.xlsx`;
    
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
  console.log('🚀 ПОЛНЫЙ АНАЛИЗ ВСЕЙ ИСТОРИИ ПЛАТЕЖЕЙ ПО ВСЕМ БОТАМ...\n');

  try {
    const result = await getAllPaymentsHistory();
    
    if (!result) {
      console.error('💥 Не удалось получить данные');
      process.exit(1);
    }

    const { botStats, monthlyStats, allTransactions } = result;

    // Выводим полный отчет в консоль
    displayFullHistoryReport(botStats, monthlyStats);

    // Создаем детальный Excel отчет
    const excelFile = createFullHistoryExcel(botStats, monthlyStats, allTransactions);

    if (excelFile) {
      console.log('\n✅ Полный анализ истории завершен успешно!');
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