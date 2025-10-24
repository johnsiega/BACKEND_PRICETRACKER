const pool = require('./config/db');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time from DB:', result.rows[0].now);
    
    // Test categories
    const categories = await pool.query('SELECT * FROM categories');
    console.log(`✅ Found ${categories.rows.length} categories`);
    
    pool.end();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
}

testConnection();
