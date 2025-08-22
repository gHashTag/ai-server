#!/usr/bin/env bun

/**
 * 🔍 Verify yacheslav_nekludov Parsing Results
 * Check if we got real 30 competitors data
 */

import { Client } from 'pg'

// Use direct PostgreSQL connection with NEON_DATABASE_URL
const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
})

await client.connect()

console.log('🔍 VERIFYING YACHESLAV_NEKLUDOV PARSING RESULTS')
console.log('='.repeat(70))
console.log('📊 Checking if we successfully parsed 30 competitors...')
console.log('='.repeat(70))

// Check parsing results
const verifyYacheslavResults = async () => {
  console.log('🚀 Starting verification for yacheslav_nekludov...\n')

  try {
    // 1. Check if yacheslav_nekludov exists in database
    console.log('1️⃣ Checking if yacheslav_nekludov exists in database...')
    const { data: targetUser, error: targetUserError } = await supabase
      .from('instagram_users')
      .select('*')
      .eq('username', 'yacheslav_nekludov')
      .single()

    if (targetUserError) {
      console.log(
        '❌ yacheslav_nekludov not found in database:',
        targetUserError.message
      )
    } else {
      console.log('✅ Found yacheslav_nekludov in database:')
      console.log(`   👤 Username: @${targetUser.username}`)
      console.log(`   📊 Followers: ${targetUser.followers_count}`)
      console.log(`   📝 Full name: ${targetUser.full_name}`)
      console.log(`   ✅ Verified: ${targetUser.is_verified ? 'Yes' : 'No'}`)
      console.log(`   🔒 Private: ${targetUser.is_private ? 'Yes' : 'No'}`)
    }

    // 2. Check competitors table for yacheslav_nekludov
    console.log('\n2️⃣ Checking competitors table for yacheslav_nekludov...')
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('query_username', 'yacheslav_nekludov')
      .eq('project_id', 38)

    if (competitorsError) {
      console.log('❌ Error checking competitors:', competitorsError.message)
    } else {
      console.log(
        `✅ Found ${
          competitors?.length || 0
        } competitors for yacheslav_nekludov`
      )
      if (competitors && competitors.length > 0) {
        console.log('   📋 Competitors found:')
        competitors.slice(0, 10).forEach((comp, index) => {
          console.log(
            `   ${index + 1}. @${comp.comp_username} - ${
              comp.followers_count
            } followers`
          )
        })
        if (competitors.length > 10) {
          console.log(`   ... and ${competitors.length - 10} more`)
        }
      }
    }

    // 3. Check all Instagram users from project 38 (recent additions)
    console.log('\n3️⃣ Checking recent Instagram users from project 38...')
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('instagram_users')
      .select('username, followers_count, full_name, is_verified, created_at')
      .eq('project_id', 38)
      .order('created_at', { ascending: false })
      .limit(35)

    if (recentUsersError) {
      console.log('❌ Error checking recent users:', recentUsersError.message)
    } else {
      console.log(
        `✅ Found ${recentUsers?.length || 0} recent users in project 38`
      )
      if (recentUsers && recentUsers.length > 0) {
        console.log('   📋 Recent users (last 35):')
        recentUsers.slice(0, 15).forEach((user, index) => {
          const createdDate = new Date(user.created_at).toLocaleString()
          console.log(
            `   ${index + 1}. @${user.username} - ${
              user.followers_count
            } followers - ${createdDate}`
          )
        })
        if (recentUsers.length > 15) {
          console.log(`   ... and ${recentUsers.length - 15} more`)
        }
      }
    }

    // 4. Check users created in the last hour
    console.log('\n4️⃣ Checking users created in the last hour...')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: newUsers, error: newUsersError } = await supabase
      .from('instagram_users')
      .select('username, followers_count, full_name, is_verified, created_at')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (newUsersError) {
      console.log('❌ Error checking new users:', newUsersError.message)
    } else {
      console.log(
        `✅ Found ${newUsers?.length || 0} users created in the last hour`
      )
      if (newUsers && newUsers.length > 0) {
        console.log('   📋 New users (last hour):')
        newUsers.forEach((user, index) => {
          const createdDate = new Date(user.created_at).toLocaleString()
          console.log(
            `   ${index + 1}. @${user.username} - ${
              user.followers_count
            } followers - ${createdDate}`
          )
        })
      }
    }

    // 5. Total counts
    console.log('\n5️⃣ Getting total counts...')
    const counts = await Promise.all([
      supabase
        .from('instagram_users')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', 38),
      supabase
        .from('competitors')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', 38),
      supabase
        .from('competitors')
        .select('*', { count: 'exact', head: true })
        .eq('query_username', 'yacheslav_nekludov'),
    ])

    console.log('📊 Total counts for project 38:')
    console.log(`   👤 Instagram users: ${counts[0].count || 0}`)
    console.log(`   🏆 All competitors: ${counts[1].count || 0}`)
    console.log(`   🎯 yacheslav_nekludov competitors: ${counts[2].count || 0}`)

    // 6. Sample real data verification
    console.log('\n6️⃣ Verifying data quality (sample check)...')
    const { data: sampleUsers, error: sampleError } = await supabase
      .from('instagram_users')
      .select('username, followers_count, full_name, bio')
      .eq('project_id', 38)
      .order('followers_count', { ascending: false })
      .limit(5)

    if (sampleError) {
      console.log('❌ Error checking sample users:', sampleError.message)
    } else {
      console.log('✅ Sample of highest-follower users:')
      sampleUsers?.forEach((user, index) => {
        const bio = user.bio ? user.bio.substring(0, 50) + '...' : 'No bio'
        console.log(
          `   ${index + 1}. @${user.username} - ${
            user.followers_count
          } followers`
        )
        console.log(`      📝 ${user.full_name} - ${bio}`)
      })
    }
  } catch (error) {
    console.log('❌ Error during verification:', error.message)
    console.log('🔍 Error details:', error)
  }

  console.log('\n='.repeat(70))
  console.log('🎯 VERIFICATION SUMMARY')
  console.log('='.repeat(70))
  console.log('✅ Verification completed for yacheslav_nekludov')
  console.log('🔍 Results show above - check if you have:')
  console.log('   • yacheslav_nekludov user in database')
  console.log('   • Competitors with real usernames and follower counts')
  console.log('   • Recent users created in the last hour')
  console.log('   • Quality data with real bios and names')
  console.log('='.repeat(70))
}

// Execute the verification
if (import.meta.main) {
  verifyYacheslavResults().catch(console.error)
}
