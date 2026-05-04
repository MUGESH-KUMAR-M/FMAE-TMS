const pool = require('../config/database');
const {
  sendRegistrationSubmittedToAdmin,
  sendRegistrationConfirmationToTeam,
  sendRegistrationApproved,
  sendRegistrationRejected,
} = require('../utils/emailService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const NotificationController = require('./NotificationController');

// POST /api/registrations — Public: Submit new registration
const submitRegistration = async (req, res) => {
  const {
    // Step 2 - Team Details
    competition_id, vehicle_class, team_name, college_name, city, state, country,
    team_email, instagram_handle,
    // Step 3 - Captain
    captain_name, captain_phone, captain_email,
    // Step 3 - Manager
    manager_name, manager_phone, manager_email,
    // Step 3 - Advisor (optional)
    advisor_name, advisor_phone, advisor_email,
    // Step 4 - Billing (Gap Fix: all 7 fields)
    billing_name, billing_address_line1, billing_address_line2,
    billing_city, billing_state, billing_pin, billing_gst,
  } = req.body;

  // Validate required fields
  if (!competition_id || !vehicle_class || !team_name || !college_name || !city ||
      !state || !team_email || !captain_name || !captain_phone || !captain_email ||
      !manager_name || !manager_phone || !manager_email) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // PRD clarification: billing details are mandatory for invoice processing
  if (!billing_name || !billing_address_line1 || !billing_city || !billing_state || !billing_pin) {
    return res.status(400).json({
      success: false,
      message: 'Billing name, address, city, state, and PIN code are required',
    });
  }

  // Check competition exists and is active
  const comp = await pool.query(
    `SELECT id, name, code, vehicle_class, status FROM competitions WHERE id = $1`,
    [competition_id]
  );
  if (!comp.rows[0]) return res.status(404).json({ success: false, message: 'Competition not found' });
  if (comp.rows[0].status !== 'ACTIVE')
    return res.status(400).json({ success: false, message: 'Competition is not accepting registrations' });

  // BSVC is EV only
  if (comp.rows[0].code === 'BSVC' && vehicle_class === 'IC')
    return res.status(400).json({ success: false, message: 'BSVC competition does not have an IC class' });

  // Check team email uniqueness across all registrations and users
  const emailCheck = await pool.query(
    `SELECT 1 FROM (
      SELECT team_email as email FROM registrations
      UNION
      SELECT email FROM users
    ) as emails WHERE email = $1`,
    [team_email.toLowerCase()]
  );
  if (emailCheck.rows.length > 0)
    return res.status(409).json({ success: false, message: 'This email is already associated with an account or registration' });

  // Check team name uniqueness per competition
  const existing = await pool.query(
    `SELECT 1 FROM registrations WHERE competition_id = $1 AND team_name ILIKE $2`,
    [competition_id, team_name]
  );
  if (existing.rows.length > 0)
    return res.status(409).json({ success: false, message: 'Team name already exists for this competition' });

  // Enforce one team per competition ecosystem (across all competitions)
  const duplicateTeam = await pool.query(
    `SELECT id, competition_id FROM registrations
     WHERE lower(team_name) = lower($1) AND lower(college_name) = lower($2)
     LIMIT 1`,
    [team_name.trim(), college_name.trim()]
  );
  if (duplicateTeam.rows.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'This team is already registered in the system and cannot register for another competition',
    });
  }

  const result = await pool.query(
    `INSERT INTO registrations (
      competition_id, vehicle_class, team_name, college_name, city, state, country,
      team_email, instagram_handle,
      captain_name, captain_phone, captain_email,
      manager_name, manager_phone, manager_email,
      advisor_name, advisor_phone, advisor_email,
      billing_name, billing_address_line1, billing_address_line2,
      billing_city, billing_state, billing_pin, billing_gst,
      status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'PENDING')
    RETURNING *`,
    [competition_id, vehicle_class, team_name, college_name, city, state, country || 'India',
     team_email, instagram_handle,
     captain_name, captain_phone, captain_email,
     manager_name, manager_phone, manager_email,
     advisor_name || null, advisor_phone || null, advisor_email || null,
     billing_name, billing_address_line1, billing_address_line2 || null,
     billing_city, billing_state, billing_pin, billing_gst || null]
  );
  const registration = result.rows[0];

  // Notify competition admin
  const adminsToNotify = await pool.query(
    `SELECT id, email FROM users 
     WHERE role = 'SUPER_ADMIN' 
     OR (role = 'ADMIN_COMPETITION' AND (competition_id = $1 OR competition_id IS NULL))`,
    [competition_id]
  );
  
  const io = req.app.get('io');

  for (const admin of adminsToNotify.rows) {
    // Send Email
    await sendRegistrationSubmittedToAdmin(admin.email, {
      ...registration,
      competition_name: comp.rows[0].name,
      id: registration.id,
    });

    // In-Portal Notification
    await NotificationController.createNotification(io, {
      user_id: admin.id,
      title: 'New Team Registration',
      message: `Team "${team_name}" has registered for ${comp.rows[0].name}.`,
      type: 'INFO',
      link: `/admin/registrations/${registration.id}`
    });
  }

  // Send Confirmation Email to Team
  await sendRegistrationConfirmationToTeam(team_email, {
    ...registration,
    competition_name: comp.rows[0].name,
  });

  logger.info(`New registration: ${team_name} for ${comp.rows[0].name}`);
  res.status(201).json({ success: true, message: 'Registration submitted successfully. Admins have been notified.', registration_id: registration.id });
};

// GET /api/registrations — Admin: Get all registrations (with filters)
const getAllRegistrations = async (req, res) => {
  const { competition_id, status, page = 1, limit = 20, search } = req.query;
  let conditions = [];
  let params = [];
  let idx = 1;

  // Competition Admins can only see their own competition's registrations
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id) {
    conditions.push(`r.competition_id = $${idx++}`);
    params.push(req.user.competition_id);
  } else if (competition_id) {
    conditions.push(`r.competition_id = $${idx++}`);
    params.push(competition_id);
  }

  if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
  if (search) {
    conditions.push(`(r.team_name ILIKE $${idx} OR r.college_name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM registrations r ${where}`, params
  );

  const result = await pool.query(
    `SELECT r.*, c.name as competition_name, c.code as competition_code
     FROM registrations r
     JOIN competitions c ON c.id = r.competition_id
     ${where}
     ORDER BY r.submitted_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    registrations: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  });
};

// GET /api/registrations/:id — Admin: Get single registration
const getRegistration = async (req, res) => {
  const result = await pool.query(
    `SELECT r.*, c.name as competition_name, c.code as competition_code, c.vehicle_class as comp_vehicle_class
     FROM registrations r
     JOIN competitions c ON c.id = r.competition_id
     WHERE r.id = $1`,
    [req.params.id]
  );
  const reg = result.rows[0];
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && reg.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this registration' });
  }

  res.json({ success: true, registration: reg });
};

// GET /api/registrations/status/:id — Public: Track submission status
const getRegistrationStatus = async (req, res) => {
  const result = await pool.query(
    `SELECT r.id, r.team_name, r.team_email, r.status, r.rejection_reason, r.submitted_at,
            c.name as competition_name, c.code as competition_code, r.vehicle_class
     FROM registrations r
     JOIN competitions c ON c.id = r.competition_id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Registration not found' });
  res.json({ success: true, registration: result.rows[0] });
};

// GET /api/registrations/my — Team: Get my registration
const getMyRegistration = async (req, res) => {
  logger.debug(`Fetching registration for user ID: ${req.user.id}`);
  const result = await pool.query(
    `SELECT r.*, c.name as competition_name, c.code as competition_code
     FROM registrations r
     JOIN competitions c ON c.id = r.competition_id
     WHERE r.team_user_id = $1 AND r.status = 'APPROVED'`,
    [req.user.id]
  );
  if (!result.rows[0]) return res.json({ success: true, registration: null });
  res.json({ success: true, registration: result.rows[0] });
};

// PUT /api/registrations/:id/approve — Admin: Approve registration
const approveRegistration = async (req, res) => {
  const regResult = await pool.query(
    `SELECT r.*, c.name as competition_name, c.code as competition_code
     FROM registrations r JOIN competitions c ON c.id = r.competition_id WHERE r.id = $1`,
    [req.params.id]
  );
  const reg = regResult.rows[0];
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && reg.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this registration' });
  }

  if (reg.status !== 'PENDING')
    return res.status(400).json({ success: false, message: `Registration is already ${reg.status}` });

  // Create or link team user account
  const existingUserResult = await pool.query(`SELECT id FROM users WHERE email = $1`, [reg.team_email]);
  let userId;
  const tempPassword = 'passwordfmae123';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  if (existingUserResult.rows.length > 0) {
    userId = existingUserResult.rows[0].id;
    // Update existing user: ensure role is TEAM, set competition_id, and reset password to '123'
    await pool.query(
      `UPDATE users 
       SET name = $1, role = 'TEAM', competition_id = $2, password = $3, is_temp_password = TRUE, is_active = TRUE, updated_at = NOW() 
       WHERE id = $4`,
      [reg.team_name, reg.competition_id, hashedPassword, userId]
    );
    logger.info(`Existing user [${reg.team_email}] updated and linked to registration. Password reset to '${tempPassword}'.`);
  } else {
    // Create new team user with password '123'
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password, role, competition_id, is_temp_password, is_active, created_by)
       VALUES ($1, $2, $3, 'TEAM', $4, TRUE, TRUE, $5) RETURNING id`,
      [reg.team_name, reg.team_email, hashedPassword, reg.competition_id, req.user.id]
    );
    userId = userResult.rows[0].id;
    logger.info(`New team user created for registration: ${reg.team_email} [User ID: ${userId}] with password '${tempPassword}'`);
  }

  // Create payment record
  await pool.query(
    `INSERT INTO payment_status (registration_id, team_id, status) VALUES ($1, $2, 'PENDING')`,
    [reg.id, userId]
  );

  // Update registration status
  await pool.query(
    `UPDATE registrations SET status = 'APPROVED', team_user_id = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [userId, req.user.id, reg.id]
  );

  // Send approval email (with credentials only if new user)
  await sendRegistrationApproved(reg.team_email, {
    competition_name: reg.competition_name,
    login_email: reg.team_email,
    temp_password: tempPassword, // Will be null if existing user
  });

  // Notify team via Notification Table
  await NotificationController.createNotification(req.app.get('io'), {
    user_id: userId,
    title: 'Registration Approved!',
    message: `Welcome to ${reg.competition_name}! Your registration has been approved.`,
    type: 'SUCCESS',
    link: '/team'
  });

  logger.info(`Registration approved: ${reg.team_name} [${reg.competition_name}]`);
  res.json({ success: true, message: 'Registration approved. Credentials sent to team email.' });
};

// PUT /api/registrations/:id/reject — Admin: Reject registration
const rejectRegistration = async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

  const regResult = await pool.query(
    `SELECT r.*, c.name as competition_name FROM registrations r
     JOIN competitions c ON c.id = r.competition_id WHERE r.id = $1`,
    [req.params.id]
  );
  const reg = regResult.rows[0];
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && reg.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this registration' });
  }
  if (reg.status !== 'PENDING')
    return res.status(400).json({ success: false, message: `Registration is already ${reg.status}` });

  await pool.query(
    `UPDATE registrations SET status = 'REJECTED', rejection_reason = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [reason, req.user.id, reg.id]
  );

  await sendRegistrationRejected(reg.team_email, {
    competition_name: reg.competition_name,
    reason,
  });

  logger.info(`Registration rejected: ${reg.team_name} — Reason: ${reason}`);
  res.json({ success: true, message: 'Registration rejected. Team has been notified.' });
};

// DELETE /api/registrations/:id — Admin: Delete registration
const deleteRegistration = async (req, res) => {
  const result = await pool.query('DELETE FROM registrations WHERE id = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Registration not found' });
  logger.info(`Registration deleted: ${result.rows[0].team_name} by ${req.user.email}`);
  res.json({ success: true, message: 'Registration deleted' });
};

module.exports = {
  submitRegistration, 
  getAllRegistrations, 
  getRegistration,
  getRegistrationStatus, 
  getMyRegistration, 
  approveRegistration, 
  rejectRegistration,
  deleteRegistration
};
