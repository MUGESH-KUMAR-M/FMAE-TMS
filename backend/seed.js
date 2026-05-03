const bcrypt = require('bcryptjs');
const pool = require('./src/config/database.js');
require('dotenv').config();

async function seed() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    const users = [
      { name: 'Super Admin User', email: 'superadmin@fmae.in', role: 'SUPER_ADMIN' },
      { name: 'Competition Admin', email: 'admin@fmae.in', role: 'ADMIN_COMPETITION' },
      { name: 'Finance Admin', email: 'finance@fmae.in', role: 'ADMIN_FINANCE' },
      { name: 'Event Judge', email: 'judge@fmae.in', role: 'JUDGE' },
      { name: 'Test Team', email: 'team@fmae.in', role: 'TEAM' }
    ];

    for (let u of users) {
      const res = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (res.rows.length > 0) {
        await pool.query('UPDATE users SET password = $1, role = $2 WHERE email = $3', [hash, u.role, u.email]);
      } else {
        await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [u.name, u.email, hash, u.role]);
      }
    }
    console.log('Seed complete');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

seed();
