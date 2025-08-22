const fs = require('fs')
const path = require('path')
const { createDatabaseConnection, validateConnection } = require('./utils/db-connection')

async function runMigration() {
  const dbPool = createDatabaseConnection()
  await validateConnection(dbPool)

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