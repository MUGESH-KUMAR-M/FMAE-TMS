// FMAE-TMS — Complete Database Migration
// All 9 tables covering full PRD requirements including all gap fixes
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fmae_tms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const migrations = [
  // ─── 1. USERS ──────────────────────────────────────────────────────────────
  // Roles: SUPER_ADMIN | ADMIN_COMPETITION | ADMIN_FINANCE | TEAM | JUDGE
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    firebase_uid VARCHAR(255),
    profile_picture VARCHAR(500),
    role VARCHAR(50) NOT NULL DEFAULT 'TEAM'
      CHECK (role IN ('SUPER_ADMIN','ADMIN_COMPETITION','ADMIN_FINANCE','TEAM','JUDGE')),
    competition_id INTEGER,
    is_temp_password BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── 2. COMPETITIONS ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS competitions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    vehicle_class VARCHAR(10) NOT NULL CHECK (vehicle_class IN ('EV','IC','BOTH')),
    description TEXT,
    rules TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Competition deadlines (repeatable label+date)
  `CREATE TABLE IF NOT EXISTS competition_deadlines (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    deadline_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── 3. REGISTRATIONS ───────────────────────────────────────────────────────
  // Gap Fix: Added billing_name, billing_state, billing_gst (from PRD §14)
  // Gap Fix: Added team_user_id FK (created on approval)
  `CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    -- Team Details
    team_name VARCHAR(255) NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    team_email VARCHAR(255) NOT NULL,
    instagram_handle VARCHAR(100),
    competition_id INTEGER NOT NULL REFERENCES competitions(id),
    vehicle_class VARCHAR(10) NOT NULL CHECK (vehicle_class IN ('EV','IC')),
    -- Captain
    captain_name VARCHAR(255) NOT NULL,
    captain_phone VARCHAR(20) NOT NULL,
    captain_email VARCHAR(255) NOT NULL,
    -- Manager
    manager_name VARCHAR(255) NOT NULL,
    manager_phone VARCHAR(20) NOT NULL,
    manager_email VARCHAR(255) NOT NULL,
    -- Faculty Advisor (optional)
    advisor_name VARCHAR(255),
    advisor_phone VARCHAR(20),
    advisor_email VARCHAR(255),
    -- Billing Details (Gap Fix from PRD §14)
    billing_name VARCHAR(255),
    billing_address_line1 VARCHAR(500),
    billing_address_line2 VARCHAR(500),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_pin VARCHAR(10),
    billing_gst VARCHAR(20),
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    rejection_reason TEXT,
    -- Link to user account (created on approval)
    team_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── 4. TASKS ───────────────────────────────────────────────────────────────
  // Gap Fix: Added max_score field for Track Event tasks (from PRD §14)
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(20) NOT NULL CHECK (task_type IN ('SUBMISSION','TRACK_EVENT')),
    weight INTEGER NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
    max_score INTEGER DEFAULT 0,
    allowed_file_types TEXT[], -- e.g. {PDF,PPT,DOCX,PNG,MP4,ZIP}
    due_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── 5. SUBMISSIONS ─────────────────────────────────────────────────────────
  // Gap Fix: Added 'NEEDS_RESUBMISSION' status for when admin edits task post-submit
  `CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    file_url VARCHAR(1000),
    file_name VARCHAR(500),
    file_size INTEGER,
    file_type VARCHAR(50),
    status VARCHAR(30) DEFAULT 'SUBMITTED'
      CHECK (status IN ('SUBMITTED','NEEDS_RESUBMISSION','VIEWED')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, task_id)
  );`,

  // ─── 6. TRACK EVENTS ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS track_events (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    admin_value VARCHAR(255),
    admin_value_unit VARCHAR(50),
    score INTEGER DEFAULT 0,
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    entered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    entered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, task_id)
  );`,

  // ─── 7. PAYMENT STATUS ──────────────────────────────────────────────────────
  // Gap Fix: 3 states — PAID | UNPAID | PENDING (team dashboard shows PAID/UNPAID/PENDING)
  `CREATE TABLE IF NOT EXISTS payment_status (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING'
      CHECK (status IN ('PAID','UNPAID','PENDING')),
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── 8. PASSWORD RESETS ─────────────────────────────────────────────────────
  // Gap Fix: Password reset flow for all users (not just super-admin-created)
  `CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── 9. AUDIT LOG ───────────────────────────────────────────────────────────
  // Gap Fix: Super Admin needs audit log — who did what and when
  `CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // ─── INDEXES ────────────────────────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_competition ON registrations(competition_id);`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_team_email ON registrations(team_email);`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_competition ON tasks(competition_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id);`,
  `CREATE INDEX IF NOT EXISTS idx_track_events_team ON track_events(team_id);`,
  `CREATE INDEX IF NOT EXISTS idx_track_events_task ON track_events(task_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payment_registration ON payment_status(registration_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);`,

  // ─── FK CONSTRAINTS (after table creation) ──────────────────────────────────
  `ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_user_competition 
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL;`,
  `ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_user_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;`,
];

async function runMigrations() {
  console.log('\n[START] FMAE-TMS - Starting Database Migrations...\n');
  const client = await pool.connect();
  try {
    for (let i = 0; i < migrations.length; i++) {
      try {
        await client.query(migrations[i]);
        // Show short label
        const firstLine = migrations[i].trim().split('\n')[0].substring(0, 70);
        console.log(`[OK] [${i + 1}/${migrations.length}] ${firstLine}`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('IF NOT EXISTS')) {
          console.log(`  ~ [${i + 1}/${migrations.length}] Already exists — skipped`);
        } else {
          console.error(`[ERROR] [${i + 1}/${migrations.length}] ${err.message}`);
        }
      }
    }
    console.log('\n[DONE] All migrations completed successfully!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
