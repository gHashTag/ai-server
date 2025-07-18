#!/usr/bin/env bun

import { Inngest } from 'inngest'

const API_URL = process.env.API_URL || 'http://localhost:4000'

console.log('API_URL', API_URL)

// Создаем клиент Inngest
console.log('🔄 Initializing Inngest client (v3 style)...')
const inngest = new Inngest({
  id: 'instagram-content-agent',
  eventKey:
    'K7T9iRqSGRrHyn5tCpEA7yJ3M3w60UKX4JdiImQKZQwr-9asldiO6FBBA5Bp-MEGYBX-K8SG4CgKtZvrR_YLRw',
})

console.log('🌐 Inngest webhook URL (v3 context):', inngest.toString())
console.log('✅ Inngest v3 client created:', !!inngest)

async function testAllFunctions() {
  console.log('\n🚀 Testing all 5 Instagram functions...')

  const baseData = {
    project_id: 1,
    requester_telegram_id: 144022504,
    metadata: {
      test: 'all-functions-sync-test',
      timestamp: new Date().toISOString(),
    },
  }

  try {
    // 1. Test findCompetitors
    console.log('\n1️⃣ Testing findCompetitors...')
    const competitors = await inngest.send({
      name: 'instagram/find-competitors',
      data: {
        ...baseData,
        username_or_id: 'alexyanovsky',
        max_users: 2,
        min_followers: 1000,
        metadata: { ...baseData.metadata, test: 'sync-test-competitors' },
      },
    })
    console.log('✅ findCompetitors sent:', competitors.ids[0])

    // 2. Test analyzeCompetitorReels
    console.log('\n2️⃣ Testing analyzeCompetitorReels...')
    const reels = await inngest.send({
      name: 'instagram/analyze-reels',
      data: {
        ...baseData,
        username: 'alexyanovsky',
        days_back: 7,
        max_reels: 3,
        metadata: { ...baseData.metadata, test: 'sync-test-reels' },
      },
    })
    console.log('✅ analyzeCompetitorReels sent:', reels.ids[0])

    // 3. Test extractTopContent
    console.log('\n3️⃣ Testing extractTopContent...')
    const topContent = await inngest.send({
      name: 'instagram/extract-top-content',
      data: {
        ...baseData,
        username: 'alexyanovsky',
        days_back: 14,
        limit: 5,
        metadata: { ...baseData.metadata, test: 'sync-test-top-content' },
      },
    })
    console.log('✅ extractTopContent sent:', topContent.ids[0])

    // 4. Test generateContentScripts
    console.log('\n4️⃣ Testing generateContentScripts...')
    const scripts = await inngest.send({
      name: 'instagram/generate-content-scripts',
      data: {
        ...baseData,
        reel_id: 'test_sync_reel',
        ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
        metadata: { ...baseData.metadata, test: 'sync-test-scripts' },
      },
    })
    console.log('✅ generateContentScripts sent:', scripts.ids[0])

    // 5. Test instagramScraperV2
    console.log('\n5️⃣ Testing instagramScraperV2...')
    const scraper = await inngest.send({
      name: 'instagram/scrape-similar-users',
      data: {
        ...baseData,
        username_or_id: 'alexyanovsky',
        max_users: 2,
        max_reels_per_user: 1,
        scrape_reels: true,
        metadata: { ...baseData.metadata, test: 'sync-test-scraper' },
      },
    })
    console.log('✅ instagramScraperV2 sent:', scraper.ids[0])

    console.log('\n🎉 All 5 functions tested successfully!')
    console.log('\n📊 Event Summary:')
    console.log(
      '┌─────────────────────────────────────────────────────────────────┐'
    )
    console.log(
      '│ Function                │ Status │ Event ID                    │'
    )
    console.log(
      '├─────────────────────────────────────────────────────────────────┤'
    )
    console.log(`│ findCompetitors         │ ✅ SENT │ ${competitors.ids[0]} │`)
    console.log(`│ analyzeCompetitorReels  │ ✅ SENT │ ${reels.ids[0]} │`)
    console.log(`│ extractTopContent       │ ✅ SENT │ ${topContent.ids[0]} │`)
    console.log(`│ generateContentScripts  │ ✅ SENT │ ${scripts.ids[0]} │`)
    console.log(`│ instagramScraperV2      │ ✅ SENT │ ${scraper.ids[0]} │`)
    console.log(
      '└─────────────────────────────────────────────────────────────────┘'
    )

    console.log('\n🔍 Check Inngest Dashboard: http://localhost:8288')
    console.log('📱 All functions should now be visible in Inngest Cloud!')
  } catch (error) {
    console.error('❌ Error testing functions:', error)
    process.exit(1)
  }
}

// Запускаем тест
testAllFunctions().catch(console.error)
