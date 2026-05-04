const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function update() {
  try {
    await pool.query("UPDATE users SET competition_id = 1 WHERE email = 'admin@fmae.in'");
    console.log('Updated admin@fmae.in');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
update();
