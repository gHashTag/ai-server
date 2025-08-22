/**
 * Quick test for Instagram Reels API fixes
 * Simple script to test the analyzeCompetitorReels function
 */

import { inngest } from '../src/core/inngest/clients'

async function quickTest() {
  console.log('🎬 Quick Test: analyzeCompetitorReels with alexyanovsky...')

  try {
    const result = await inngest.send({
      name: 'instagram/analyze-reels',
      data: {
        username: 'alexyanovsky',
        max_reels: 3,
        days_back: 7,
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'quick-reels-test',
          timestamp: new Date().toISOString(),
        },
      },
    })

    console.log('✅ Test event sent successfully!')
    console.log('📊 Event ID:', result.ids[0])
    console.log('🔍 Check Inngest Dashboard: http://localhost:8288')
    console.log('📱 Monitor logs for results')
  } catch (error) {
    console.error('❌ Quick test failed:', error)
  }
}

quickTest()
