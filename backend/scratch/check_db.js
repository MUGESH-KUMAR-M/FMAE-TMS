const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function check() {
  try {
    const comps = await pool.query('SELECT id, code, name FROM competitions');
    console.log('Competitions:', comps.rows);
    const users = await pool.query("SELECT id, email, role, competition_id FROM users");
    console.log('Users:', users.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
