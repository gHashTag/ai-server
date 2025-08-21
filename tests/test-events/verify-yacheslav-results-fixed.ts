#!/usr/bin/env bun

/**
 * 🔍 Verify yacheslav_nekludov Parsing Results (Fixed)
 * Check if we got real 30 competitors data using direct PostgreSQL connection
 */

import { Client } from 'pg'

// Use direct PostgreSQL connection with NEON_DATABASE_URL
const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
})

console.log('🔍 VERIFYING YACHESLAV_NEKLUDOV PARSING RESULTS (FIXED)')
console.log('='.repeat(70))
console.log('📊 Using direct PostgreSQL connection with NEON_DATABASE_URL')
console.log('📊 Project ID: 38')
console.log('='.repeat(70))

// Check parsing results
const verifyYacheslavResults = async () => {
  console.log('🚀 Starting verification for yacheslav_nekludov...\n')

  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')

    // 1. Check if yacheslav_nekludov exists in database
    console.log('\n1️⃣ Checking if yacheslav_nekludov exists in database...')
    try {
      const result = await client.query(
        'SELECT * FROM instagram_users WHERE username = $1 AND project_id = 38',
        ['yacheslav_nekludov']
      )

      if (result.rows.length === 0) {
        console.log(
          '❌ yacheslav_nekludov not found in database for project 38'
        )
      } else {
        const targetUser = result.rows[0]
        console.log('✅ Found yacheslav_nekludov in database:')
        console.log(`   👤 Username: @${targetUser.username}`)
        console.log(`   📊 Followers: ${targetUser.followers_count}`)
        console.log(`   📝 Full name: ${targetUser.full_name}`)
        console.log(`   ✅ Verified: ${targetUser.is_verified ? 'Yes' : 'No'}`)
        console.log(`   🔒 Private: ${targetUser.is_private ? 'Yes' : 'No'}`)
      }
    } catch (error) {
      console.log('❌ Error checking yacheslav_nekludov:', error.message)
    }

    // 2. Check competitors table for yacheslav_nekludov
    console.log('\n2️⃣ Checking competitors table for yacheslav_nekludov...')
    try {
      const result = await client.query(
        'SELECT * FROM competitors WHERE query_username = $1 AND project_id = 38',
        ['yacheslav_nekludov']
      )

      console.log(
        `✅ Found ${result.rows.length} competitors for yacheslav_nekludov`
      )
      if (result.rows.length > 0) {
        console.log('   📋 Competitors found:')
        result.rows.slice(0, 10).forEach((comp, index) => {
          console.log(
            `   ${index + 1}. @${comp.comp_username} - ${
              comp.followers_count
            } followers`
          )
        })
        if (result.rows.length > 10) {
          console.log(`   ... and ${result.rows.length - 10} more`)
        }
      }
    } catch (error) {
      console.log('❌ Error checking competitors:', error.message)
    }

    // 3. Check all Instagram users from project 38 (recent additions)
    console.log('\n3️⃣ Checking recent Instagram users from project 38...')
    try {
      const result = await client.query(
        'SELECT username, followers_count, full_name, is_verified, created_at FROM instagram_users WHERE project_id = 38 ORDER BY created_at DESC LIMIT 35'
      )

      console.log(`✅ Found ${result.rows.length} recent users in project 38`)
      if (result.rows.length > 0) {
        console.log('   📋 Recent users (last 35):')
        result.rows.slice(0, 15).forEach((user, index) => {
          const createdDate = new Date(user.created_at).toLocaleString()
          console.log(
            `   ${index + 1}. @${user.username} - ${
              user.followers_count
            } followers - ${createdDate}`
          )
        })
        if (result.rows.length > 15) {
          console.log(`   ... and ${result.rows.length - 15} more`)
        }
      }
    } catch (error) {
      console.log('❌ Error checking recent users:', error.message)
    }

    // 4. Check users created in the last hour
    console.log('\n4️⃣ Checking users created in the last hour...')
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const result = await client.query(
        'SELECT username, followers_count, full_name, is_verified, created_at FROM instagram_users WHERE created_at >= $1 ORDER BY created_at DESC',
        [oneHourAgo]
      )

      console.log(
        `✅ Found ${result.rows.length} users created in the last hour`
      )
      if (result.rows.length > 0) {
        console.log('   📋 New users (last hour):')
        result.rows.forEach((user, index) => {
          const createdDate = new Date(user.created_at).toLocaleString()
          console.log(
            `   ${index + 1}. @${user.username} - ${
              user.followers_count
            } followers - ${createdDate}`
          )
        })
      }
    } catch (error) {
      console.log('❌ Error checking new users:', error.message)
    }

    // 5. Total counts
    console.log('\n5️⃣ Getting total counts...')
    try {
      const [usersResult, competitorsResult, yacheslavCompetitorsResult] =
        await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM instagram_users WHERE project_id = 38'
          ),
          client.query(
            'SELECT COUNT(*) FROM competitors WHERE project_id = 38'
          ),
          client.query(
            'SELECT COUNT(*) FROM competitors WHERE query_username = $1 AND project_id = 38',
            ['yacheslav_nekludov']
          ),
        ])

      console.log('📊 Total counts for project 38:')
      console.log(`   👤 Instagram users: ${usersResult.rows[0].count}`)
      console.log(`   🏆 All competitors: ${competitorsResult.rows[0].count}`)
      console.log(
        `   🎯 yacheslav_nekludov competitors: ${yacheslavCompetitorsResult.rows[0].count}`
      )
    } catch (error) {
      console.log('❌ Error getting total counts:', error.message)
    }

    // 6. Sample real data verification
    console.log('\n6️⃣ Verifying data quality (sample check)...')
    try {
      const result = await client.query(
        'SELECT username, followers_count, full_name, bio FROM instagram_users WHERE project_id = 38 ORDER BY followers_count DESC LIMIT 5'
      )

      console.log('✅ Sample of highest-follower users:')
      result.rows.forEach((user, index) => {
        const bio = user.bio ? user.bio.substring(0, 50) + '...' : 'No bio'
        console.log(
          `   ${index + 1}. @${user.username} - ${
            user.followers_count
          } followers`
        )
        console.log(`      📝 ${user.full_name} - ${bio}`)
      })
    } catch (error) {
      console.log('❌ Error checking sample users:', error.message)
    }

    // 7. Check for yacheslav_nekludov related data
    console.log('\n7️⃣ Checking for yacheslav_nekludov related data...')
    try {
      const result = await client.query(
        'SELECT username, followers_count, full_name, bio FROM instagram_users WHERE username ILIKE $1 AND project_id = 38',
        ['%yacheslav%']
      )

      console.log(
        `✅ Found ${result.rows.length} users with 'yacheslav' in username`
      )
      if (result.rows.length > 0) {
        result.rows.forEach((user, index) => {
          console.log(
            `   ${index + 1}. @${user.username} - ${
              user.followers_count
            } followers`
          )
          console.log(`      📝 ${user.full_name}`)
        })
      }
    } catch (error) {
      console.log('❌ Error checking yacheslav related data:', error.message)
    }
  } catch (error) {
    console.log('❌ Error during verification:', error.message)
    console.log('🔍 Error details:', error)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }

  console.log('\n='.repeat(70))
  console.log('🎯 VERIFICATION SUMMARY')
  console.log('='.repeat(70))
  console.log('✅ Verification completed for yacheslav_nekludov')
  console.log('🔍 Results show above - check if you have:')
  console.log('   • yacheslav_nekludov user in database (project 38)')
  console.log('   • Competitors with real usernames and follower counts')
  console.log('   • Recent users created in the last hour')
  console.log('   • Quality data with real bios and names')
  console.log('')
  console.log('🔧 PostgreSQL connection string used:')
  console.log(`   ${process.env.NEON_DATABASE_URL?.substring(0, 50)}...`)
  console.log('='.repeat(70))
}

// Execute the verification
if (import.meta.main) {
  verifyYacheslavResults().catch(console.error)
}
