const pool = require('../config/database');
const { sendTrackValueEntered } = require('../utils/emailService');
const logger = require('../utils/logger');
const NotificationController = require('./NotificationController');
const { calculateScoresForTask } = require('../utils/scoringService');

// POST /api/track-events/tasks/:taskId/enter — Admin: Enter value for a team
// Gap Fix: This is the missing "Admin enters track event value per team" UI spec
const enterTrackValue = async (req, res) => {
  const { taskId } = req.params;
  const { registration_id, admin_value, admin_value_unit, score, admin_time } = req.body;

  if (!registration_id || (admin_value === undefined && admin_time === undefined))
    return res.status(400).json({ success: false, message: 'registration_id and either admin_value or admin_time are required' });

  // Get team's user account
  const reg = await pool.query(
    `SELECT r.*, u.email as team_email, u.name as team_name
     FROM registrations r JOIN users u ON u.id = r.team_user_id
     WHERE r.id = $1 AND r.status = 'APPROVED'`,
    [registration_id]
  );
  if (!reg.rows[0]) return res.status(404).json({ success: false, message: 'Registration not found or not approved' });
  const registration = reg.rows[0];

  const task = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  if (!task.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
  const taskData = task.rows[0];

  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && taskData.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this task' });
  }

  if (taskData.task_type !== 'TRACK_EVENT')
    return res.status(400).json({ success: false, message: 'This task is not a track event' });

  // Upsert track event record (admin can re-enter if not yet approved)
  const existing = await pool.query(
    `SELECT id, approved FROM track_events WHERE team_id = $1 AND task_id = $2`,
    [registration.team_user_id, taskId]
  );
  if (existing.rows[0]?.approved)
    return res.status(400).json({ success: false, message: 'Value already approved by team and cannot be changed' });

  const result = await pool.query(
    `INSERT INTO track_events (team_id, task_id, registration_id, admin_value, admin_value_unit, score, admin_time, entered_by, entered_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (team_id, task_id) DO UPDATE
     SET admin_value=$4, admin_value_unit=$5, score=$6, admin_time=$7, approved=FALSE, entered_by=$8, entered_at=NOW(), updated_at=NOW()
     RETURNING *`,
    [registration.team_user_id, taskId, registration_id, admin_value || admin_time, admin_value_unit, score || 0, admin_time || null, req.user.id]
  );

  // If task has a formula, recalculate scores for all teams
  if (task.rows[0].formula_type !== 'NONE') {
    await calculateScoresForTask(taskId);
  }

  // Notify team
  await sendTrackValueEntered(registration.team_email, {
    task_name: task.rows[0].name,
    value: admin_value,
    unit: admin_value_unit,
  });

  // Real-time notification
  await NotificationController.createNotification(req.app.get('io'), {
    user_id: registration.team_user_id,
    title: 'Track Event Value Recorded',
    message: `Admin has recorded a value for "${task.rows[0].name}". Please review and approve.`,
    type: 'INFO',
    link: '/team'
  });

  logger.info(`Track event value entered: Task ${taskId} for team ${registration.team_name} = ${admin_value}`);
  res.json({ success: true, track_event: result.rows[0] });
};

// GET /api/track-events/tasks/:taskId/teams — Admin: Get all team values for a task
const getTaskTrackEvents = async (req, res) => {
  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id) {
    const taskCheck = await pool.query(`SELECT competition_id FROM tasks WHERE id = $1`, [req.params.taskId]);
    if (taskCheck.rows[0] && taskCheck.rows[0].competition_id !== req.user.competition_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this task' });
    }
  }

  const result = await pool.query(
    `SELECT te.*, u.name as team_name, r.college_name, r.vehicle_class
     FROM track_events te
     JOIN users u ON u.id = te.team_id
     JOIN registrations r ON r.team_user_id = u.id
     WHERE te.task_id = $1
     ORDER BY te.score DESC`,
    [req.params.taskId]
  );
  // Also get all approved teams without a track event entry (for the admin entry table)
  const unenteredTeams = await pool.query(
    `SELECT u.id as team_id, u.name as team_name, r.id as registration_id, r.college_name, r.vehicle_class
     FROM registrations r
     JOIN users u ON u.id = r.team_user_id
     LEFT JOIN track_events te ON te.team_id = u.id AND te.task_id = $1
     JOIN tasks t ON t.id = $1
     WHERE r.competition_id = t.competition_id AND r.status = 'APPROVED' AND te.id IS NULL`,
    [req.params.taskId]
  );
  res.json({ success: true, track_events: result.rows, unentered_teams: unenteredTeams.rows });
};

// POST /api/track-events/:id/approve — Team: Approve their track event value
const approveTrackEvent = async (req, res) => {
  const result = await pool.query(
    `SELECT te.*, r.competition_id, r.id as registration_id 
     FROM track_events te 
     JOIN registrations r ON r.id = te.registration_id 
     WHERE te.id = $1`, [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Track event not found' });
  const te = result.rows[0];

  if (te.team_id !== req.user.id)
    return res.status(403).json({ success: false, message: 'Forbidden' });
  if (te.approved)
    return res.status(400).json({ success: false, message: 'Already approved — cannot change' });
  if (!te.admin_value)
    return res.status(400).json({ success: false, message: 'No value entered by admin yet' });

  await pool.query(
    `UPDATE track_events SET approved=TRUE, approved_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [te.id]
  );

  // Emit socket event for real-time leaderboard update
  const io = req.app.get('io');
  if (io) io.emit('leaderboard-updated', { competition_id: te.competition_id });

  // Notify Admins
  const adminsToNotify = await pool.query(
    `SELECT id FROM users 
     WHERE role = 'SUPER_ADMIN' 
     OR (role = 'ADMIN_COMPETITION' AND competition_id = (SELECT competition_id FROM tasks WHERE id = $1))`,
    [te.task_id]
  );
  for (const admin of adminsToNotify.rows) {
    await NotificationController.createNotification(io, {
      user_id: admin.id,
      title: 'Track Value Approved',
      message: `Team "${req.user.name}" has approved their value for task ID ${te.task_id}.`,
      type: 'SUCCESS',
      link: `/admin/registrations/${te.registration_id}`
    });
  }

  logger.info(`Track event approved: Team ${req.user.id}, task ${te.task_id}`);
  res.json({ success: true, message: 'Value approved. Score added to leaderboard.' });
};

// GET /api/track-events/my — Team: Get own track events
const getMyTrackEvents = async (req, res) => {
  const result = await pool.query(
    `SELECT te.*, t.name as task_name, t.max_score, t.weight
     FROM track_events te
     JOIN tasks t ON t.id = te.task_id
     WHERE te.team_id = $1
     ORDER BY te.created_at`,
    [req.user.id]
  );
  res.json({ success: true, track_events: result.rows });
};

// GET /api/track-events/approved-values — Judge/Admin: read-only approved values across teams
const getApprovedValues = async (req, res) => {
  const { competition_id, task_id, vehicle_class } = req.query;
  const params = [];
  const conditions = [`te.approved = TRUE`, `t.task_type = 'TRACK_EVENT'`, `r.status = 'APPROVED'`];
  let idx = 1;

  if (competition_id) {
    conditions.push(`r.competition_id = $${idx++}`);
    params.push(competition_id);
  }
  if (task_id) {
    conditions.push(`te.task_id = $${idx++}`);
    params.push(task_id);
  }
  if (vehicle_class) {
    conditions.push(`r.vehicle_class = $${idx++}`);
    params.push(vehicle_class);
  }

  const result = await pool.query(
    `SELECT te.id, te.task_id, te.team_id, te.registration_id, te.admin_value, te.admin_value_unit,
            te.score, te.approved_at, t.name as task_name, t.max_score,
            r.team_name, r.college_name, r.vehicle_class, r.competition_id, c.code as competition_code
     FROM track_events te
     JOIN tasks t ON t.id = te.task_id
     JOIN registrations r ON r.id = te.registration_id
     JOIN competitions c ON c.id = r.competition_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.code ASC, t.name ASC, te.score DESC, te.approved_at DESC`,
    params
  );

  res.json({ success: true, approved_values: result.rows });
};

// DELETE /api/track-events/:id — Admin: Delete track event entry
const deleteTrackEvent = async (req, res) => {
  const existing = await pool.query(
    `SELECT te.*, t.competition_id 
     FROM track_events te JOIN tasks t ON t.id = te.task_id 
     WHERE te.id = $1`, 
    [req.params.id]
  );
  if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Track event not found' });
  
  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && existing.rows[0].competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this track event entry' });
  }

  if (existing.rows[0].approved)
    return res.status(400).json({ success: false, message: 'Cannot delete approved track event value' });

  await pool.query('DELETE FROM track_events WHERE id = $1', [req.params.id]);
  logger.info(`Track event deleted: ID ${req.params.id} by ${req.user.email}`);
  res.json({ success: true, message: 'Track event entry deleted' });
};

module.exports = {
  enterTrackValue,
  getTaskTrackEvents,
  approveTrackEvent,
  getMyTrackEvents,
  getApprovedValues,
  deleteTrackEvent,
};
