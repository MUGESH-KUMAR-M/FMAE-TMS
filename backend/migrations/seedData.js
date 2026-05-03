// FMAE-TMS — Seed Data
// Seeds all 7 competitions and 1 Super Admin account
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fmae_tms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const COMPETITIONS = [
  { code: 'FKDC', name: 'Formula Kart Design Challenge', vehicle_class: 'BOTH' },
  { code: 'DKDC', name: 'Design Kart Design Challenge', vehicle_class: 'BOTH' },
  { code: 'QBDC', name: 'Quad Bike Design Challenge', vehicle_class: 'BOTH' },
  { code: 'F.BAJA', name: 'Formula BAJA', vehicle_class: 'BOTH' },
  { code: 'FFS', name: 'Formula FS', vehicle_class: 'BOTH' },
  { code: 'F.MOTO.S', name: 'Formula Moto Sport', vehicle_class: 'BOTH' },
  { code: 'BSVC', name: 'BSVC', vehicle_class: 'EV' }, // EV only, no IC class
];

async function seed() {
  console.log('\n🌱 FMAE-TMS — Seeding Database...\n');
  const client = await pool.connect();

  try {
    // 1. Create Super Admin
    const superAdminExists = await client.query(
      `SELECT id FROM users WHERE email = 'admin@fmae.in'`
    );
    if (superAdminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin@FMAE2026', 10);
      await client.query(
        `INSERT INTO users (name, email, password, role, is_temp_password, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['FMAE Super Admin', 'admin@fmae.in', hashedPassword, 'SUPER_ADMIN', false, true]
      );
      console.log('[OK] Super Admin created - admin@fmae.in / Admin@FMAE2026');
    } else {
      console.log('  ~ Super Admin already exists');
    }

    // 2. Seed competitions
    for (const comp of COMPETITIONS) {
      const exists = await client.query(
        `SELECT id FROM competitions WHERE code = $1`, [comp.code]
      );
      if (exists.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO competitions (code, name, vehicle_class, status)
           VALUES ($1, $2, $3, 'ACTIVE') RETURNING id`,
          [comp.code, comp.name, comp.vehicle_class]
        );
        // Add sample deadlines
        await client.query(
          `INSERT INTO competition_deadlines (competition_id, label, deadline_date)
           VALUES ($1, $2, $3), ($1, $4, $5)`,
          [result.rows[0].id,
           'Design Report Due', '2026-06-15',
           'Technical Inspection', '2026-07-01']
        );
        console.log(`[OK] Competition seeded: ${comp.code} - ${comp.name}`);
      } else {
        console.log(`  ~ Competition already exists: ${comp.code}`);
      }
    }

    console.log('\n[DONE] Seed completed!\n');
    console.log('[INFO] Super Admin: admin@fmae.in');
    console.log('[INFO] Password: Admin@FMAE2026');
    console.log('[WARN] Change this password immediately in production!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
