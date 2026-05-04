const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendNewUserCreated } = require('../utils/emailService');
const logger = require('../utils/logger');

const isCompAdminOnly = (req) => req.user?.role === 'ADMIN_COMPETITION';

const ensureCompAdminScope = (req, payload = {}) => {
  if (!isCompAdminOnly(req)) return { ok: true };
  if (!req.user?.competition_id) {
    return { ok: false, status: 403, message: 'Competition Admin is not assigned to any competition' };
  }
  if (payload.role && payload.role !== 'TEAM') {
    return { ok: false, status: 403, message: 'Competition Admin can manage TEAM users only' };
  }
  if (payload.competition_id && Number(payload.competition_id) !== Number(req.user.competition_id)) {
    return { ok: false, status: 403, message: 'You can only manage users in your assigned competition' };
  }
  return { ok: true };
};

// GET /api/users — Super Admin: Get all users
const getAllUsers = async (req, res) => {
  const { role, competition_id, page = 1, limit = 20, search } = req.query;
  let conditions = [];
  let params = [];
  let idx = 1;

  if (isCompAdminOnly(req)) {
    if (!req.user?.competition_id) {
      return res.json({ success: true, users: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
    }
    conditions.push(`u.role = $${idx++}`);
    params.push('TEAM');
    conditions.push(`u.competition_id = $${idx++}`);
    params.push(req.user.competition_id);
  } else {
    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
    if (competition_id) { conditions.push(`u.competition_id = $${idx++}`); params.push(competition_id); }
  }

  if (search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const countResult = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params);

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.competition_id, u.is_active, u.is_temp_password,
            u.last_login, u.created_at, c.name as competition_name, c.code as competition_code
     FROM users u LEFT JOIN competitions c ON c.id = u.competition_id
     ${where} ORDER BY u.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  res.json({
    success: true, users: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page), limit: parseInt(limit),
  });
};

// POST /api/users — Super Admin: Create user
const createUser = async (req, res) => {
  const { name, email, role, competition_id, password } = req.body;
  const scopeCheck = ensureCompAdminScope(req, { role, competition_id });
  if (!scopeCheck.ok) return res.status(scopeCheck.status).json({ success: false, message: scopeCheck.message });

  const effectiveRole = isCompAdminOnly(req) ? 'TEAM' : role;
  const effectiveCompetitionId = isCompAdminOnly(req) ? req.user.competition_id : competition_id;

  if (!name || !email || !role)
    return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
  if (!['ADMIN_COMPETITION','ADMIN_FINANCE','JUDGE','TEAM'].includes(effectiveRole))
    return res.status(400).json({ success: false, message: 'Invalid role' });
  if (effectiveRole === 'TEAM' && !effectiveCompetitionId) {
    return res.status(400).json({ success: false, message: 'Competition assignment is required for Team users' });
  }

  const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
  if (exists.rows[0]) return res.status(409).json({ success: false, message: 'Email already in use' });

  const initialPassword = password && String(password).trim().length > 0
    ? String(password).trim()
    : crypto.randomBytes(6).toString('hex').toUpperCase();
  const hashedPassword = await bcrypt.hash(initialPassword, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, competition_id, is_temp_password, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,TRUE,TRUE,$6) RETURNING id, name, email, role, competition_id`,
    [name, email.toLowerCase(), hashedPassword, effectiveRole, effectiveCompetitionId || null, req.user.id]
  );
  const user = result.rows[0];

  // Send welcome email with credentials
  await sendNewUserCreated(email, { name, role, temp_password: initialPassword });

  logger.info(`User created: ${email} [${role}] by ${req.user.email}`);
  res.status(201).json({ 
    success: true, 
    user, 
    tempPassword: initialPassword, // returned for super admin to share
    message: 'User created. Credentials sent to email.' 
  });
};

// PUT /api/users/:id/toggle-active — Super Admin: Activate/Deactivate user
const toggleUserActive = async (req, res) => {
  if (isCompAdminOnly(req)) {
    const scoped = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'TEAM' AND competition_id = $2`,
      [req.params.id, req.user.competition_id]
    );
    if (!scoped.rows[0]) return res.status(404).json({ success: false, message: 'Team user not found in your competition' });
  }

  const result = await pool.query(
    `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1
     RETURNING id, name, email, role, is_active`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
  const action = result.rows[0].is_active ? 'activated' : 'deactivated';
  logger.info(`User ${action}: ${result.rows[0].email} by ${req.user.email}`);
  res.json({ success: true, user: result.rows[0], message: `User ${action}` });
};

// POST /api/users/:id/reset-password — Super Admin: Reset user password
const resetUserPassword = async (req, res) => {
  const userResult = await pool.query(`SELECT id, name, email, role, competition_id FROM users WHERE id = $1`, [req.params.id]);
  if (!userResult.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
  const user = userResult.rows[0];
  if (isCompAdminOnly(req) && (user.role !== 'TEAM' || Number(user.competition_id) !== Number(req.user.competition_id))) {
    return res.status(403).json({ success: false, message: 'You can only reset TEAM users from your competition' });
  }

  const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  await pool.query(
    `UPDATE users SET password=$1, is_temp_password=TRUE, updated_at=NOW() WHERE id=$2`,
    [hashedPassword, user.id]
  );
  await sendNewUserCreated(user.email, { name: user.name, role: 'your account', temp_password: tempPassword });
  logger.info(`Password reset for ${user.email} by ${req.user.email}`);
  res.json({ 
    success: true, 
    tempPassword: tempPassword,
    message: 'Password reset. New credentials sent to user.' 
  });
};

// PUT /api/users/:id — Super Admin: Update user (name, role, competition)
const updateUser = async (req, res) => {
  const { name, role, competition_id } = req.body;
  if (isCompAdminOnly(req)) {
    const scoped = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'TEAM' AND competition_id = $2`,
      [req.params.id, req.user.competition_id]
    );
    if (!scoped.rows[0]) return res.status(404).json({ success: false, message: 'Team user not found in your competition' });
  }

  const scopeCheck = ensureCompAdminScope(req, { role, competition_id });
  if (!scopeCheck.ok) return res.status(scopeCheck.status).json({ success: false, message: scopeCheck.message });

  const effectiveRole = isCompAdminOnly(req) ? 'TEAM' : role;
  const effectiveCompetitionId = isCompAdminOnly(req) ? req.user.competition_id : competition_id;

  const result = await pool.query(
    `UPDATE users SET name=COALESCE($1,name), role=COALESCE($2,role),
     competition_id=COALESCE($3,competition_id), updated_at=NOW()
     WHERE id=$4 RETURNING id, name, email, role, competition_id, is_active`,
    [name, effectiveRole, effectiveCompetitionId, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: result.rows[0] });
};

// GET /api/users/stats — Super Admin: Global system stats
const getSystemStats = async (req, res) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role != 'SUPER_ADMIN') as total_users,
      (SELECT COUNT(*) FROM competitions) as total_competitions,
      (SELECT COUNT(*) FROM competitions WHERE status='ACTIVE') as active_competitions,
      (SELECT COUNT(*) FROM registrations) as total_registrations,
      (SELECT COUNT(*) FROM registrations WHERE status='PENDING') as pending_registrations,
      (SELECT COUNT(*) FROM registrations WHERE status='APPROVED') as approved_registrations,
      (SELECT COUNT(*) FROM registrations WHERE status='REJECTED') as rejected_registrations,
      (SELECT COUNT(*) FROM tasks) as total_tasks,
      (SELECT COUNT(*) FROM submissions) as total_submissions,
      (SELECT COUNT(*) FROM payment_status WHERE status='PAID') as paid_count,
      (SELECT COUNT(*) FROM payment_status WHERE status='PENDING') as payment_pending_count
  `);
  res.json({ success: true, stats: result.rows[0] });
};

// DELETE /api/users/:id — Super Admin: Delete user
const deleteUser = async (req, res) => {
  if (isCompAdminOnly(req)) {
    const scoped = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'TEAM' AND competition_id = $2`,
      [req.params.id, req.user.competition_id]
    );
    if (!scoped.rows[0]) return res.status(404).json({ success: false, message: 'Team user not found in your competition' });
  }

  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
  logger.info(`User deleted: ${result.rows[0].email} by ${req.user.email}`);
  res.json({ success: true, message: 'User deleted' });
};

module.exports = { 
  getAllUsers, 
  createUser, 
  toggleUserActive, 
  resetUserPassword, 
  updateUser, 
  getSystemStats,
  deleteUser 
};
