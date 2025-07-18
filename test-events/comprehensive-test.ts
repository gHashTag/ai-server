/**
 * Comprehensive test script for all Instagram Inngest functions
 * Tests all functions with real data and verifies results
 */

import { inngest } from '../src/core/inngest/clients'
import {
  validateProjectId,
  ensureProjectsTableExists,
} from '../src/core/instagram/database-validation'

async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive test of all Instagram functions...')
  console.log('📊 All functions use REAL data - no mocks!')

  try {
    // Step 0: Verify project exists
    console.log('\n0️⃣ Verifying project exists...')
    await ensureProjectsTableExists()
    const projectValidation = await validateProjectId(1)

    if (!projectValidation.exists) {
      console.error('❌ Project ID 1 does not exist!')
      return
    }

    console.log(`✅ Project validated: ${projectValidation.projectName}`)

    // Step 1: Test findCompetitors
    console.log('\n1️⃣ Testing findCompetitors...')
    const competitors = await inngest.send({
      name: 'instagram/find-competitors',
      data: {
        username_or_id: 'alexyanovsky',
        max_users: 3,
        min_followers: 1000,
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'comprehensive-competitors',
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log('✅ findCompetitors event sent:', competitors.ids[0])

    // Step 2: Test analyzeCompetitorReels
    console.log('\n2️⃣ Testing analyzeCompetitorReels...')
    const analysis = await inngest.send({
      name: 'instagram/analyze-reels',
      data: {
        username: 'alexyanovsky',
        max_reels: 5,
        days_back: 14,
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'comprehensive-analysis',
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log('✅ analyzeCompetitorReels event sent:', analysis.ids[0])

    // Step 3: Test extractTopContent
    console.log('\n3️⃣ Testing extractTopContent...')
    const topContent = await inngest.send({
      name: 'instagram/extract-top-content',
      data: {
        username: 'alexyanovsky',
        limit: 5,
        days_back: 14,
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'comprehensive-top-content',
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log('✅ extractTopContent event sent:', topContent.ids[0])

    // Step 4: Test generateContentScripts
    console.log('\n4️⃣ Testing generateContentScripts...')
    const scripts = await inngest.send({
      name: 'instagram/generate-content-scripts',
      data: {
        reel_id: 'test_comprehensive',
        ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'comprehensive-scripts',
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log('✅ generateContentScripts event sent:', scripts.ids[0])

    // Step 5: Test instagramScraperV2
    console.log('\n5️⃣ Testing instagramScraperV2...')
    const scraper = await inngest.send({
      name: 'instagram/scrape-similar-users',
      data: {
        username_or_id: 'alexyanovsky',
        max_users: 2,
        max_reels_per_user: 2,
        scrape_reels: true,
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'comprehensive-scraper',
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log('✅ instagramScraperV2 event sent:', scraper.ids[0])

    // Final summary
    console.log('\n🎉 All tests initiated successfully!')
    console.log('\n📊 Event IDs for monitoring:')
    console.log(
      '┌─────────────────────────────────────────────────────────────────┐'
    )
    console.log(
      '│ Function                │ Event ID                             │'
    )
    console.log(
      '├─────────────────────────────────────────────────────────────────┤'
    )
    console.log(`│ findCompetitors         │ ${competitors.ids[0]} │`)
    console.log(`│ analyzeCompetitorReels  │ ${analysis.ids[0]} │`)
    console.log(`│ extractTopContent       │ ${topContent.ids[0]} │`)
    console.log(`│ generateContentScripts  │ ${scripts.ids[0]} │`)
    console.log(`│ instagramScraperV2      │ ${scraper.ids[0]} │`)
    console.log(
      '└─────────────────────────────────────────────────────────────────┘'
    )

    console.log('\n🔍 Monitor functions at: http://localhost:8288')
    console.log('⏱️ Wait 2-3 minutes for completion, then run verification:')
    console.log('')
    console.log('📋 Verification commands:')
    console.log('  bun run test-events/verify-results.ts')
    console.log('  grep "✅" logs.txt | tail -20')
    console.log('  grep "❌" logs.txt | tail -10')
    console.log('')
    console.log('🗄️ Database verification:')
    console.log(
      '  psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM competitors WHERE project_id = 1"'
    )
    console.log(
      '  psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM reels_analysis WHERE project_id = 1"'
    )
    console.log('')
    console.log('📈 Expected results:')
    console.log('  ✅ Real Instagram users in competitors table')
    console.log('  ✅ Real reels metrics in reels_analysis table')
    console.log('  ✅ Generated scripts in content_scripts table')
    console.log('  ✅ All API calls successful with real data')
  } catch (error) {
    console.error('❌ Test setup failed:', error)
    process.exit(1)
  }
}

// Run the test
runComprehensiveTest().catch(console.error)
