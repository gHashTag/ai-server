#!/usr/bin/env bun

/**
 * 🔍 Verify Real Data in Database
 * Check if the data in database is real, not fake
 */

import { supabase } from '@/core/supabase'

console.log('🔍 VERIFYING REAL DATA IN DATABASE')
console.log('='.repeat(60))
console.log('📊 Checking if data is real, not fake...')
console.log('='.repeat(60))

// Check real data in database
const verifyRealData = async () => {
  console.log('🚀 Starting data verification...\n')

  try {
    // 1. Check projects
    console.log('1️⃣ Checking projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description')
      .limit(10)

    if (projectsError) {
      console.log('❌ Projects error:', projectsError.message)
    } else {
      console.log(`✅ Found ${projects?.length || 0} projects`)
      projects?.forEach(p => {
        console.log(`   📋 Project ${p.id}: ${p.name}`)
      })
    }

    // 2. Check Instagram users
    console.log('\n2️⃣ Checking Instagram users...')
    const { data: users, error: usersError } = await supabase
      .from('instagram_users')
      .select('id, username, followers_count, full_name, is_verified')
      .limit(10)
      .order('followers_count', { ascending: false })

    if (usersError) {
      console.log('❌ Users error:', usersError.message)
    } else {
      console.log(`✅ Found ${users?.length || 0} Instagram users`)
      users?.forEach(u => {
        console.log(
          `   👤 @${u.username} - ${u.full_name} - ${
            u.followers_count
          } followers ${u.is_verified ? '✅' : ''}`
        )
      })
    }

    // 3. Check Instagram reels
    console.log('\n3️⃣ Checking Instagram reels...')
    const { data: reels, error: reelsError } = await supabase
      .from('instagram_reels')
      .select('id, username, caption, likes_count, views_count, comments_count')
      .limit(10)
      .order('likes_count', { ascending: false })

    if (reelsError) {
      console.log('❌ Reels error:', reelsError.message)
    } else {
      console.log(`✅ Found ${reels?.length || 0} Instagram reels`)
      reels?.forEach(r => {
        const caption = r.caption
          ? r.caption.substring(0, 50) + '...'
          : 'No caption'
        console.log(
          `   🎬 @${r.username} - ${r.likes_count} likes, ${r.views_count} views - "${caption}"`
        )
      })
    }

    // 4. Check reels_analysis
    console.log('\n4️⃣ Checking reels analysis...')
    const { data: analysis, error: analysisError } = await supabase
      .from('reels_analysis')
      .select(
        'id, comp_username, views_count, likes_count, comments_count, caption'
      )
      .limit(10)
      .order('views_count', { ascending: false })

    if (analysisError) {
      console.log('❌ Analysis error:', analysisError.message)
    } else {
      console.log(`✅ Found ${analysis?.length || 0} reels analysis records`)
      analysis?.forEach(a => {
        const caption = a.caption
          ? a.caption.substring(0, 50) + '...'
          : 'No caption'
        console.log(
          `   📊 @${a.comp_username} - ${a.views_count} views, ${a.likes_count} likes - "${caption}"`
        )
      })
    }

    // 5. Check specific user yacheslav_nekludov
    console.log('\n5️⃣ Checking specific user: yacheslav_nekludov...')
    const { data: specificUser, error: specificUserError } = await supabase
      .from('instagram_users')
      .select('*')
      .eq('username', 'yacheslav_nekludov')
      .single()

    if (specificUserError) {
      console.log(
        '❌ User yacheslav_nekludov not found:',
        specificUserError.message
      )
    } else {
      console.log('✅ Found yacheslav_nekludov:')
      console.log(`   👤 @${specificUser.username}`)
      console.log(`   📊 Followers: ${specificUser.followers_count}`)
      console.log(`   ✅ Verified: ${specificUser.is_verified ? 'Yes' : 'No'}`)
      console.log(`   🔒 Private: ${specificUser.is_private ? 'Yes' : 'No'}`)
      console.log(`   📝 Full name: ${specificUser.full_name}`)
    }

    // 6. Check similar users for yacheslav_nekludov
    console.log('\n6️⃣ Checking similar users for yacheslav_nekludov...')
    const { data: similarUsers, error: similarError } = await supabase
      .from('instagram_users')
      .select('username, followers_count, full_name, is_verified')
      .gte('followers_count', 1000)
      .neq('username', 'yacheslav_nekludov')
      .limit(10)
      .order('followers_count', { ascending: false })

    if (similarError) {
      console.log('❌ Similar users error:', similarError.message)
    } else {
      console.log(
        `✅ Found ${similarUsers?.length || 0} potential similar users`
      )
      similarUsers?.forEach(u => {
        console.log(
          `   👤 @${u.username} - ${u.followers_count} followers ${
            u.is_verified ? '✅' : ''
          }`
        )
      })
    }

    // 7. Total counts
    console.log('\n7️⃣ Getting total counts...')
    const counts = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase
        .from('instagram_users')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('instagram_reels')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('reels_analysis')
        .select('*', { count: 'exact', head: true }),
    ])

    console.log('📊 Total records:')
    console.log(`   📋 Projects: ${counts[0].count || 0}`)
    console.log(`   👤 Users: ${counts[1].count || 0}`)
    console.log(`   🎬 Reels: ${counts[2].count || 0}`)
    console.log(`   📊 Analysis: ${counts[3].count || 0}`)
  } catch (error) {
    console.log('❌ Error during verification:', error.message)
    console.log('🔍 Error details:', error)
  }

  console.log('\n='.repeat(60))
  console.log('🎯 VERIFICATION SUMMARY')
  console.log('='.repeat(60))
  console.log('✅ Data verification completed')
  console.log('🔍 If you see real usernames, follower counts, and captions,')
  console.log('   then the data is REAL, not fake!')
  console.log('📊 Check the results above to verify authenticity')
  console.log('='.repeat(60))
}

// Execute the verification
if (import.meta.main) {
  verifyRealData().catch(console.error)
}
