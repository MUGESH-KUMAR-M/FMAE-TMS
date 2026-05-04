const pool = require('../config/database');
const logger = require('../utils/logger');
const NotificationController = require('./NotificationController');

// GET /api/scrutineering — Admin: Get all inspections
const getAllInspections = async (req, res) => {
  const { competition_id, status } = req.query;
  let conditions = [`r.status = 'APPROVED'`];
  let params = [];
  let idx = 1;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.competition_id) {
    conditions.push(`r.competition_id = $${idx++}`);
    params.push(req.user.competition_id);
  } else if (competition_id) {
    conditions.push(`r.competition_id = $${idx++}`);
    params.push(competition_id);
  }
  if (status) { conditions.push(`ti.status = $${idx++}`); params.push(status); }

  const result = await pool.query(
    `SELECT ti.id as inspection_id, ti.status as inspection_status, ti.notes, ti.marked_at,
            r.id as registration_id, r.team_name, r.college_name, r.vehicle_class,
            c.name as competition_name, u.name as marked_by_name
     FROM registrations r
     JOIN competitions c ON c.id = r.competition_id
     LEFT JOIN technical_inspections ti ON ti.registration_id = r.id
     LEFT JOIN users u ON u.id = ti.marked_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.team_name`,
    params
  );

  res.json({ success: true, inspections: result.rows });
};

// PUT /api/scrutineering/:id — Admin: Update inspection status
const updateInspection = async (req, res) => {
  const { registration_id, status, notes } = req.body;
  if (!['PENDING', 'PASS', 'FAIL'].includes(status))
    return res.status(400).json({ success: false, message: 'Status must be PENDING, PASS, or FAIL' });

  // Check if team exists
  const regResult = await pool.query(`SELECT team_user_id, competition_id FROM registrations WHERE id = $1`, [registration_id]);
  const reg = regResult.rows[0];
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

  // Scoping check for Admins
  if (req.user.role !== 'SUPER_ADMIN' && req.user.competition_id && reg.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this registration' });
  }

  const result = await pool.query(
    `INSERT INTO technical_inspections (registration_id, team_id, status, notes, marked_by, marked_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (registration_id) DO UPDATE
     SET status = $3, notes = $4, marked_by = $5, marked_at = NOW(), updated_at = NOW()
     RETURNING *`,
    [registration_id, reg.rows[0].team_user_id, status, notes, req.user.id]
  );

  // Notify team
  await NotificationController.createNotification(req.app.get('io'), {
    user_id: reg.rows[0].team_user_id,
    title: 'Technical Inspection Update',
    message: `Your vehicle technical inspection status is now: ${status}.`,
    type: status === 'PASS' ? 'SUCCESS' : (status === 'FAIL' ? 'ERROR' : 'INFO'),
    link: '/team'
  });

  logger.info(`Technical inspection updated for reg ${registration_id}: ${status} by ${req.user.email}`);
  res.json({ success: true, inspection: result.rows[0] });
};

// GET /api/scrutineering/my — Team: Get own inspection status
const getMyInspection = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM technical_inspections WHERE team_id = $1`,
    [req.user.id]
  );
  res.json({ success: true, inspection: result.rows[0] || { status: 'PENDING' } });
};

module.exports = { getAllInspections, updateInspection, getMyInspection };
