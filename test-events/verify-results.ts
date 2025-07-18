/**
 * Verification script for Instagram function results
 * Checks database for real data inserted by the functions
 */

import { Pool } from 'pg'
import { validateProjectId } from '../src/core/instagram/database-validation'

// Database connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
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

    // Test 2: Competitors data
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
        ? `✅ Found ${
            competitorsData.count
          } competitors, avg followers: ${Math.round(
            competitorsData.avg_followers
          )}`
        : '❌ No competitors found in last hour',
      data: competitorsData,
    })

    // Test 3: Reels analysis data
    console.log('\n3️⃣ Verifying reels analysis data...')
    const reelsResult = await pool.query(`
      SELECT COUNT(*) as count,
             COUNT(DISTINCT comp_username) as unique_users,
             AVG(likes_count) as avg_likes,
             AVG(views_count) as avg_views,
             MAX(likes_count) as max_likes
      FROM reels_analysis 
      WHERE project_id = 1 
      AND created_at > NOW() - INTERVAL '1 hour'
    `)

    const reelsData = reelsResult.rows[0]
    const reelsPassed = parseInt(reelsData.count) > 0
    results.push({
      test: 'Reels Analysis Data',
      passed: reelsPassed,
      message: reelsPassed
        ? `✅ Found ${reelsData.count} reels, avg likes: ${Math.round(
            reelsData.avg_likes
          )}, max likes: ${reelsData.max_likes}`
        : '❌ No reels found in last hour',
      data: reelsData,
    })

    // Test 4: Content scripts data
    console.log('\n4️⃣ Verifying content scripts data...')
    const scriptsResult = await pool.query(`
      SELECT COUNT(*) as count,
             COUNT(CASE WHEN script_v1 IS NOT NULL THEN 1 END) as has_script_v1,
             COUNT(CASE WHEN script_v2 IS NOT NULL THEN 1 END) as has_script_v2,
             COUNT(CASE WHEN script_v3 IS NOT NULL THEN 1 END) as has_script_v3
      FROM content_scripts 
      WHERE project_id = 1 
      AND created_at > NOW() - INTERVAL '1 hour'
    `)

    const scriptsData = scriptsResult.rows[0]
    const scriptsPassed = parseInt(scriptsData.count) > 0
    results.push({
      test: 'Content Scripts Data',
      passed: scriptsPassed,
      message: scriptsPassed
        ? `✅ Found ${scriptsData.count} scripts, v1: ${scriptsData.has_script_v1}, v2: ${scriptsData.has_script_v2}, v3: ${scriptsData.has_script_v3}`
        : '❌ No scripts found in last hour',
      data: scriptsData,
    })

    // Test 5: Instagram users data
    console.log('\n5️⃣ Verifying Instagram users data...')
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
      test: 'Instagram Users Data',
      passed: usersPassed,
      message: usersPassed
        ? `✅ Found ${usersData.count} users, verified: ${usersData.verified_users}`
        : '❌ No users found in last hour',
      data: usersData,
    })

    // Test 6: Instagram reels data
    console.log('\n6️⃣ Verifying Instagram reels data...')
    const instagramReelsResult = await pool.query(`
      SELECT COUNT(*) as count,
             AVG(like_count) as avg_likes,
             AVG(play_count) as avg_plays,
             COUNT(DISTINCT owner_username) as unique_owners
      FROM instagram_reels 
      WHERE project_id = 1 
      AND created_at > NOW() - INTERVAL '1 hour'
    `)

    const instagramReelsData = instagramReelsResult.rows[0]
    const instagramReelsPassed = parseInt(instagramReelsData.count) > 0
    results.push({
      test: 'Instagram Reels Data',
      passed: instagramReelsPassed,
      message: instagramReelsPassed
        ? `✅ Found ${instagramReelsData.count} reels, avg likes: ${Math.round(
            instagramReelsData.avg_likes
          )}`
        : '❌ No Instagram reels found in last hour',
      data: instagramReelsData,
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
      '  psql $NEON_DATABASE_URL -c "SELECT * FROM competitors WHERE project_id = 1 ORDER BY created_at DESC LIMIT 3"'
    )
    console.log(
      '  psql $NEON_DATABASE_URL -c "SELECT reel_id, caption, likes_count FROM reels_analysis WHERE project_id = 1 ORDER BY likes_count DESC LIMIT 3"'
    )
    console.log(
      '  psql $NEON_DATABASE_URL -c "SELECT username, is_verified FROM instagram_similar_users WHERE project_id = 1 ORDER BY created_at DESC LIMIT 3"'
    )
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run verification
verifyResults().catch(console.error)
