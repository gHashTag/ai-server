const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const connectionString = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_5RWzh7CwrXxE@ep-delicate-block-a1l1lt0p-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  
  const dbPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  })

  try {
    console.log('🔧 Applying competitor subscriptions migration...')
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../src/db/migrations/create_competitor_subscriptions.sql'),
      'utf8'
    )
    
    await dbPool.query(migrationSQL)
    console.log('✅ Migration applied successfully!')
    
    // Проверяем созданные таблицы
    const result = await dbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'competitor%'
      ORDER BY table_name
    `)
    
    console.log('📊 Created tables:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await dbPool.end()
  }
}

runMigration()