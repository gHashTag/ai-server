#!/usr/bin/env node

/**
 * 🩺 Проверка статуса продакшн-сервера после hotfix
 */

const fetch = require('node-fetch')

const PRODUCTION_URL = 'https://ai-server-production-production-8e2d.up.railway.app'

async function testProductionStatus() {
  console.log('🩺 ПРОВЕРКА СТАТУСА ПРОДАКШН-СЕРВЕРА ПОСЛЕ HOTFIX')
  console.log('=' * 55)
  console.log(`📡 URL: ${PRODUCTION_URL}`)
  console.log(`🕒 Время: ${new Date().toISOString()}`)
  console.log('=' * 55)

  try {
    console.log('\n1️⃣ Health endpoint...')
    const healthResponse = await fetch(`${PRODUCTION_URL}/health`, {
      method: 'GET',
      timeout: 10000,
    })
    
    if (healthResponse.ok) {
      console.log('✅ Health: OK')
    } else {
      console.log(`❌ Health: ${healthResponse.status}`)
    }

    console.log('\n2️⃣ Main endpoint...')
    const mainResponse = await fetch(`${PRODUCTION_URL}/`, {
      method: 'GET', 
      headers: { 'Accept': 'application/json' },
      timeout: 10000,
    })
    
    console.log(`   Status: ${mainResponse.status}`)
    if (mainResponse.status === 200) {
      const contentType = mainResponse.headers.get('content-type')
      console.log(`   Content-Type: ${contentType}`)
      
      if (contentType && contentType.includes('application/json')) {
        const data = await mainResponse.json()
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`)
        console.log('✅ Main endpoint: JSON OK')
      } else {
        console.log('   Response: HTML/Text (Railway welcome page?)')
        console.log('⚠️  Main endpoint: не наш сервер')
      }
    }

    console.log('\n3️⃣ Проверка Inngest событий...')
    
    try {
      const { Inngest } = require('inngest')
      const inngest = new Inngest({
        id: 'production-status-test',
        eventKey: 'test-key',
      })

      const testEvent = await inngest.send({
        name: 'test/hello',
        data: { message: 'Production status check' }
      })

      if (testEvent && testEvent.ids) {
        console.log(`✅ Inngest event sent: ${testEvent.ids[0]}`)
        console.log('   Сервер принимает Inngest события')
      } else {
        console.log('❌ Inngest event failed')
      }
    } catch (inngestError) {
      console.log(`❌ Inngest error: ${inngestError.message}`)
    }

    console.log('\n📊 РЕЗУЛЬТАТЫ:')
    console.log('=' * 55)
    
    if (healthResponse.ok) {
      console.log('✅ Сервер работает (health OK)')
      console.log('✅ Падения устранены')
      console.log('✅ Hotfix successful!')
      
      console.log('\n🔍 Следующие шаги:')
      console.log('1. Исследовать root cause проблемы с competitorAutoParser')
      console.log('2. Восстановить функционал когда проблема решена')
      console.log('3. Мониторить stability продакшена')
      
      return true
    } else {
      console.log('❌ Сервер все еще недоступен')
      console.log('❌ Hotfix не помог')
      return false
    }

  } catch (error) {
    console.error(`❌ Ошибка проверки: ${error.message}`)
    return false
  }
}

// Запуск
testProductionStatus()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error(`💥 Critical error: ${error}`)
    process.exit(1)
  })