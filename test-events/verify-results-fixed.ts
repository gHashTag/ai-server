/**
 * Fixed verification script for Instagram function results
 * Works with actual database schema from Neon
 */

import { Pool } from 'pg'
import { validateProjectId } from '../src/core/instagram/database-validation'

// Database connection
const pool = new Pool({
  connectionString:
    process.env.NEON_DATABASE_URL || 'postgresql://user:password@host/db',
  ssl: {
    rejectUnauthorized: false,
  },
})

interface VerificationResult {
  test: string
  passed: boolean
  message: string
  data?: any
}

async function verifyResults() {
  console.log('🔍 Verifying Instagram function results...')
  console.log('📊 Checking for REAL data in database')

  const results: VerificationResult[] = []

  try {
    // Test 1: Project validation
    console.log('\n1️⃣ Verifying project validation...')
    const projectValidation = await validateProjectId(1)
    results.push({
      test: 'Project Validation',
      passed: projectValidation.exists,
      message: projectValidation.exists
        ? `✅ Project exists: ${projectValidation.projectName}`
        : '❌ Project does not exist',
      data: projectValidation,
    })

    // Test 2: Competitors data (using actual schema)
    console.log('\n2️⃣ Verifying competitors data...')
    const competitorsResult = await pool.query(`
      SELECT COUNT(*) as count, 
             COUNT(DISTINCT username) as unique_users
      FROM competitors 
      WHERE project_id = 1 
      AND created_at > NOW() - INTERVAL '1 hour'
    `)

    const competitorsData = competitorsResult.rows[0]
    const competitorsPassed = parseInt(competitorsData.count) > 0
    results.push({
      test: 'Competitors Data',
      passed: competitorsPassed,
      message: competitorsPassed
        ? `✅ Found ${competitorsData.count} competitors, unique users: ${competitorsData.unique_users}`
        : '❌ No competitors found in last hour',
      data: competitorsData,
    })

    // Test 3: Instagram user reels data (using actual schema)
    console.log('\n3️⃣ Verifying Instagram user reels data...')
    const reelsResult = await pool.query(`
      SELECT COUNT(*) as count,
             COUNT(DISTINCT owner_username) as unique_users,
             AVG(like_count) as avg_likes,
             AVG(play_count) as avg_plays,
             MAX(like_count) as max_likes
      FROM instagram_user_reels 
      WHERE project_id = 1 
      AND created_at > NOW() - INTERVAL '1 hour'
    `)

    const reelsData = reelsResult.rows[0]
    const reelsPassed = parseInt(reelsData.count) > 0
    results.push({
      test: 'Instagram User Reels Data',
      passed: reelsPassed,
      message: reelsPassed
        ? `✅ Found ${reelsData.count} reels, avg likes: ${Math.round(
            reelsData.avg_likes
          )}, max likes: ${reelsData.max_likes}`
        : '❌ No reels found in last hour',
      data: reelsData,
    })

    // Test 4: Instagram similar users data
    console.log('\n4️⃣ Verifying Instagram similar users data...')
    const usersResult = await pool.query(`
      SELECT COUNT(*) as count,
             COUNT(DISTINCT username) as unique_users,
             COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users
      FROM instagram_similar_users 
      WHERE project_id = 1 
      AND created_at > NOW() - INTERVAL '1 hour'
    `)

    const usersData = usersResult.rows[0]
    const usersPassed = parseInt(usersData.count) > 0
    results.push({
      test: 'Instagram Similar Users Data',
      passed: usersPassed,
      message: usersPassed
        ? `✅ Found ${usersData.count} users, verified: ${usersData.verified_users}`
        : '❌ No users found in last hour',
      data: usersData,
    })

    // Test 5: Check for any recent activity (general)
    console.log('\n5️⃣ Verifying recent activity...')
    const activityResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM competitors WHERE project_id = 1 AND created_at > NOW() - INTERVAL '1 hour') as competitors_count,
        (SELECT COUNT(*) FROM instagram_user_reels WHERE project_id = 1 AND created_at > NOW() - INTERVAL '1 hour') as reels_count,
        (SELECT COUNT(*) FROM instagram_similar_users WHERE project_id = 1 AND created_at > NOW() - INTERVAL '1 hour') as users_count
    `)

    const activityData = activityResult.rows[0]
    const totalActivity =
      parseInt(activityData.competitors_count) +
      parseInt(activityData.reels_count) +
      parseInt(activityData.users_count)
    const activityPassed = totalActivity > 0
    results.push({
      test: 'Recent Activity',
      passed: activityPassed,
      message: activityPassed
        ? `✅ Total activity: ${totalActivity} records (competitors: ${activityData.competitors_count}, reels: ${activityData.reels_count}, users: ${activityData.users_count})`
        : '❌ No recent activity found',
      data: activityData,
    })

    // Summary
    console.log('\n📊 Verification Summary:')
    console.log(
      '┌─────────────────────────────────────────────────────────────────┐'
    )
    console.log(
      '│ Test                    │ Status │ Details                      │'
    )
    console.log(
      '├─────────────────────────────────────────────────────────────────┤'
    )

    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      const testName = result.test.padEnd(23)
      const message =
        result.message.length > 30
          ? result.message.substring(0, 27) + '...'
          : result.message.padEnd(30)
      console.log(`│ ${testName} │ ${status} │ ${message} │`)
    })

    console.log(
      '└─────────────────────────────────────────────────────────────────┘'
    )

    const passedTests = results.filter(r => r.passed).length
    const totalTests = results.length

    console.log(
      `\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`
    )

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Functions are working with REAL data')
      console.log('✅ System is ready for production deployment')
    } else {
      console.log('⚠️  Some tests failed. Check function logs for details.')
      console.log('🔍 Check Inngest Dashboard: http://localhost:8288')
    }

    // Detailed results
    console.log('\n📋 Detailed Results:')
    results.forEach(result => {
      console.log(`\n${result.test}:`)
      console.log(`  Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  Message: ${result.message}`)
      if (result.data) {
        console.log(`  Data: ${JSON.stringify(result.data, null, 2)}`)
      }
    })

    // Sample data queries
    console.log('\n🔍 Sample Data Queries:')
    console.log('To see actual data, run:')
    console.log(
      '  psql "$NEON_DATABASE_URL" -c "SELECT * FROM competitors WHERE project_id = 1 ORDER BY created_at DESC LIMIT 3"'
    )
    console.log(
      '  psql "$NEON_DATABASE_URL" -c "SELECT reel_id, caption, like_count FROM instagram_user_reels WHERE project_id = 1 ORDER BY like_count DESC LIMIT 3"'
    )
    console.log(
      '  psql "$NEON_DATABASE_URL" -c "SELECT username, is_verified FROM instagram_similar_users WHERE project_id = 1 ORDER BY created_at DESC LIMIT 3"'
    )

    // Check if functions are still running
    console.log('\n⏱️ Function Status Check:')
    console.log('If tests failed, functions might still be running. Check:')
    console.log('  - Inngest Dashboard: http://localhost:8288')
    console.log('  - Wait 2-3 minutes for functions to complete')
    console.log('  - Run this verification script again')
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run verification
verifyResults().catch(console.error)
