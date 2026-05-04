// FMAE-TMS — Database Reset Script
// WARNING: This will delete ALL data in the database!
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fmae_tms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const tables = [
  'technical_inspections',
  'notifications',
  'audit_logs',
  'password_resets',
  'payment_status',
  'track_events',
  'submissions',
  'tasks',
  'registrations',
  'competition_deadlines',
  'competitions',
  'users'
];

async function resetDb() {
  console.log('\n[WARNING] Starting Database Reset...');
  const client = await pool.connect();
  try {
    // Drop constraints first to avoid dependency issues if needed, 
    // but CASCADE is easier
    console.log('Dropping all tables...');
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`[OK] Dropped table: ${table}`);
    }

    console.log('\n[SUCCESS] All tables dropped.');
    console.log('Re-initializing database...');
    
    // We will run migrations and seed using npm scripts after this
  } catch (err) {
    console.error('[ERROR] Reset failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDb().then(() => {
  console.log('\n[NEXT STEP] Run "npm run setup" to recreate tables and seed data.\n');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
