#!/usr/bin/env node

/**
 * Скрипт для исследования данных в таблице payments_v2
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

const { createClient } = require('@supabase/supabase-js');

// Инициализируем Supabase клиент
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreData() {
  try {
    console.log('🔍 Исследуем структуру данных в payments_v2...\n');

    // 1. Общее количество записей
    console.log('📊 1. ОБЩАЯ СТАТИСТИКА:');
    const { data: totalData, error: countError, count } = await supabase
      .from('payments_v2')
      .select('id', { count: 'exact' })
      .limit(10);
    
    if (countError) {
      console.error('Ошибка подсчета записей:', countError.message);
    } else {
      console.log(`   Всего записей в таблице: ${count || 'неизвестно'}`);
    }

    // 2. Диапазон дат
    console.log('\n📅 2. ДИАПАЗОН ДАТ:');
    const { data: dateRange, error: dateError } = await supabase
      .from('payments_v2')
      .select('payment_date')
      .not('payment_date', 'is', null)
      .order('payment_date', { ascending: true })
      .limit(1);
    
    const { data: dateRangeMax, error: dateErrorMax } = await supabase
      .from('payments_v2')
      .select('payment_date')
      .not('payment_date', 'is', null)
      .order('payment_date', { ascending: false })
      .limit(1);

    if (!dateError && !dateErrorMax && dateRange?.[0] && dateRangeMax?.[0]) {
      console.log(`   Самая ранняя дата: ${dateRange[0].payment_date}`);
      console.log(`   Самая поздняя дата: ${dateRangeMax[0].payment_date}`);
    }

    // 3. Статусы платежей
    console.log('\n📋 3. СТАТУСЫ ПЛАТЕЖЕЙ:');
    const { data: statuses, error: statusError } = await supabase
      .from('payments_v2')
      .select('status')
      .not('status', 'is', null);
    
    if (!statusError && statuses) {
      const statusCounts = {};
      statuses.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} записей`);
      });
    }

    // 4. Типы операций
    console.log('\n🔄 4. ТИПЫ ОПЕРАЦИЙ:');
    const { data: types, error: typeError } = await supabase
      .from('payments_v2')
      .select('type')
      .not('type', 'is', null);
    
    if (!typeError && types) {
      const typeCounts = {};
      types.forEach(item => {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      });
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} записей`);
      });
    }

    // 5. Боты
    console.log('\n🤖 5. БОТЫ:');
    const { data: bots, error: botError } = await supabase
      .from('payments_v2')
      .select('bot_name')
      .not('bot_name', 'is', null);
    
    if (!botError && bots) {
      const botCounts = {};
      bots.forEach(item => {
        botCounts[item.bot_name] = (botCounts[item.bot_name] || 0) + 1;
      });
      const sortedBots = Object.entries(botCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      console.log('   Топ-10 ботов по количеству записей:');
      sortedBots.forEach(([bot, count]) => {
        console.log(`   - ${bot}: ${count} записей`);
      });
    }

    // 6. Валюты
    console.log('\n💱 6. ВАЛЮТЫ:');
    const { data: currencies, error: currencyError } = await supabase
      .from('payments_v2')
      .select('currency')
      .not('currency', 'is', null);
    
    if (!currencyError && currencies) {
      const currencyCounts = {};
      currencies.forEach(item => {
        currencyCounts[item.currency] = (currencyCounts[item.currency] || 0) + 1;
      });
      Object.entries(currencyCounts).forEach(([currency, count]) => {
        console.log(`   ${currency}: ${count} записей`);
      });
    }

    // 7. Записи с доходами за 2024 год
    console.log('\n💰 7. ДОХОДЫ ЗА 2024 ГОД:');
    const { data: incomes2024, error: income2024Error } = await supabase
      .from('payments_v2')
      .select('payment_date, bot_name, amount, stars, currency, type, status')
      .eq('type', 'MONEY_INCOME')
      .eq('status', 'COMPLETED')
      .gte('payment_date', '2024-01-01T00:00:00.000Z')
      .lt('payment_date', '2025-01-01T00:00:00.000Z');
    
    if (!income2024Error && incomes2024) {
      console.log(`   Всего записей доходов за 2024: ${incomes2024.length}`);
      
      // Группировка по месяцам
      const monthCounts = {};
      incomes2024.forEach(item => {
        if (item.payment_date) {
          const date = new Date(item.payment_date);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          const key = `${year}-${month.toString().padStart(2, '0')}`;
          monthCounts[key] = (monthCounts[key] || 0) + 1;
        }
      });

      console.log('   Распределение по месяцам:');
      Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, count]) => {
          console.log(`   - ${month}: ${count} записей`);
        });

      // Записи с bot_name для 2024
      const botsWithIncomes = incomes2024.filter(item => item.bot_name && item.bot_name !== null);
      console.log(`   Записи с bot_name: ${botsWithIncomes.length}`);
    }

    // 8. Проверяем конкретно май-июль 2024
    console.log('\n🎯 8. МАЙ-ИЮЛЬ 2024 ДЕТАЛЬНО:');
    const { data: mayJuly, error: mayJulyError } = await supabase
      .from('payments_v2')
      .select('*')
      .gte('payment_date', '2024-05-01T00:00:00.000Z')
      .lt('payment_date', '2024-08-01T00:00:00.000Z');
    
    if (!mayJulyError) {
      console.log(`   Всего записей за май-июль 2024: ${mayJuly?.length || 0}`);
      
      if (mayJuly && mayJuly.length > 0) {
        const completed = mayJuly.filter(item => item.status === 'COMPLETED');
        const income = mayJuly.filter(item => item.type === 'MONEY_INCOME');
        const withBots = mayJuly.filter(item => item.bot_name && item.bot_name !== null);
        
        console.log(`   - COMPLETED статус: ${completed.length}`);
        console.log(`   - MONEY_INCOME тип: ${income.length}`);
        console.log(`   - С bot_name: ${withBots.length}`);
        
        const completedIncome = mayJuly.filter(item => 
          item.status === 'COMPLETED' && 
          item.type === 'MONEY_INCOME'
        );
        console.log(`   - COMPLETED + MONEY_INCOME: ${completedIncome.length}`);
        
        const completedIncomeWithBots = completedIncome.filter(item => 
          item.bot_name && item.bot_name !== null
        );
        console.log(`   - COMPLETED + MONEY_INCOME + bot_name: ${completedIncomeWithBots.length}`);

        if (completedIncomeWithBots.length > 0) {
          console.log('\n   Примеры записей:');
          completedIncomeWithBots.slice(0, 3).forEach((item, index) => {
            console.log(`   ${index + 1}. Bot: ${item.bot_name}, Date: ${item.payment_date}, Amount: ${item.amount} ${item.currency}, Stars: ${item.stars}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка исследования данных:', error);
  }
}

exploreData();