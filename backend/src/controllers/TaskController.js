const pool = require('../config/database');
const { sendTaskPublished, sendTaskEditedResubmit } = require('../utils/emailService');
const logger = require('../utils/logger');
const NotificationController = require('./NotificationController');

const ensurePublishWeightExactly100 = async (competitionId, nextWeight, taskIdToExclude = null) => {
  const params = [competitionId];
  let excludeSql = '';
  if (taskIdToExclude) {
    params.push(taskIdToExclude);
    excludeSql = `AND id != $2`;
  }

  const totalWeight = await pool.query(
    `SELECT COALESCE(SUM(weight),0) as total FROM tasks WHERE competition_id=$1 AND status='PUBLISHED' ${excludeSql}`,
    params
  );

  const resultingWeight = parseInt(totalWeight.rows[0].total, 10) + parseInt(nextWeight, 10);
  if (resultingWeight !== 100) {
    return {
      valid: false,
      message: `To publish, total published task weight must be exactly 100%. Current published total (excluding this task): ${totalWeight.rows[0].total}%.`,
    };
  }

  return { valid: true };
};

// GET /api/tasks — Get tasks (supports filters)
const getTasks = async (req, res) => {
  const { competition_id, status } = req.query;
  let competitionId = competition_id;

  // Auto-scope for Team users
  if (req.user.role === 'TEAM') {
    const reg = await pool.query(
      `SELECT competition_id FROM registrations WHERE team_user_id = $1 AND status = 'APPROVED'`, [req.user.id]
    );
    if (!reg.rows[0]) {
      competitionId = req.user.competition_id;
    } else {
      competitionId = reg.rows[0].competition_id;
    }
    if (!competitionId) return res.json({ success: true, tasks: [] });
  } else if (!competitionId && req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id) {
    // Default to admin's assigned competition if none specified
    competitionId = req.user.competition_id;
  }

  let query = `SELECT t.*, c.code as competition_code 
               FROM tasks t 
               JOIN competitions c ON c.id = t.competition_id`;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (competitionId) {
    conditions.push(`t.competition_id = $${idx++}`);
    params.push(competitionId);
  }

  if (status) {
    conditions.push(`t.status = $${idx++}`);
    params.push(status);
  } else if (req.user.role === 'TEAM') {
    conditions.push(`t.status = 'PUBLISHED'`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY t.created_at`;

  const result = await pool.query(query, params);
  res.json({ success: true, tasks: result.rows });
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  const result = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, task: result.rows[0] });
};

// POST /api/tasks — Admin: Create task
const createTask = async (req, res) => {
  const { competition_id, name, description, task_type, weight, max_score, allowed_file_types, due_date, status } = req.body;
  if (!competition_id || !name || !task_type || weight === undefined)
    return res.status(400).json({ success: false, message: 'competition_id, name, task_type, weight are required' });

  // PRD rule: publishing is allowed only when total published weight is exactly 100%
  if (status === 'PUBLISHED') {
    const publishCheck = await ensurePublishWeightExactly100(competition_id, weight);
    if (!publishCheck.valid) return res.status(400).json({ success: false, message: publishCheck.message });
  }

  const result = await pool.query(
    `INSERT INTO tasks (competition_id, name, description, task_type, weight, max_score, allowed_file_types, due_date, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [competition_id, name, description, task_type, weight, max_score || 0,
     allowed_file_types || [], due_date, status || 'DRAFT', req.user.id]
  );
  const task = result.rows[0];

  // If publishing, notify all approved teams
  if (status === 'PUBLISHED') {
    const teams = await pool.query(
      `SELECT u.id, u.email FROM users u
       JOIN registrations r ON r.team_user_id = u.id
       WHERE r.competition_id = $1 AND r.status = 'APPROVED'`,
      [competition_id]
    );
    const teamEmails = teams.rows.map(r => r.email);
    if (teamEmails.length) {
      await sendTaskPublished(teamEmails, task);
      
      // Real-time notifications
      for (const team of teams.rows) {
        await NotificationController.createNotification(req.app.get('io'), {
          user_id: team.id,
          title: 'New Task Published',
          message: `A new task "${task.name}" has been published.`,
          type: 'INFO',
          link: '/team'
        });
      }
    }
  }

  logger.info(`Task created: ${name} [${task_type}] for competition ${competition_id}`);
  res.status(201).json({ success: true, task });
};

// PUT /api/tasks/:id — Admin: Update task (Gap Fix: notify teams to resubmit)
const updateTask = async (req, res) => {
  const { name, description, weight, max_score, allowed_file_types, due_date, status } = req.body;
  const taskId = req.params.id;

  const existing = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
  const existingTask = existing.rows[0];

  const nextStatus = status || existingTask.status;
  const nextWeight = weight !== undefined && weight !== null ? weight : existingTask.weight;
  if (nextStatus === 'PUBLISHED') {
    const publishCheck = await ensurePublishWeightExactly100(existingTask.competition_id, nextWeight, taskId);
    if (!publishCheck.valid) return res.status(400).json({ success: false, message: publishCheck.message });
  }

  const result = await pool.query(
    `UPDATE tasks SET name=COALESCE($1,name), description=COALESCE($2,description),
     weight=COALESCE($3,weight), max_score=COALESCE($4,max_score),
     allowed_file_types=COALESCE($5,allowed_file_types), due_date=COALESCE($6,due_date),
     status=COALESCE($7,status), updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [name, description, weight, max_score, allowed_file_types, due_date, status, taskId]
  );

  const updatedTask = result.rows[0];

  // Gap Fix: If published task is edited, mark submissions as NEEDS_RESUBMISSION and email teams
  if (existingTask.status === 'PUBLISHED') {
    const affected = await pool.query(
      `UPDATE submissions SET status='NEEDS_RESUBMISSION', updated_at=NOW()
       WHERE task_id=$1 AND status='SUBMITTED'
       RETURNING team_id`,
      [taskId]
    );
    if (affected.rows.length > 0) {
      const teamIds = affected.rows.map(r => r.team_id);
      const teamEmails = await pool.query(
        `SELECT email FROM users WHERE id = ANY($1)`, [teamIds]
      );
      for (const { email } of teamEmails.rows) {
        await sendTaskEditedResubmit(email, {
          task_name: updatedTask.name,
          new_due_date: updatedTask.due_date,
        });
      }
    }
  }

  // If newly publishing (was draft), notify teams
  if (existingTask.status === 'DRAFT' && status === 'PUBLISHED') {
    const teams = await pool.query(
      `SELECT u.email FROM users u
       JOIN registrations r ON r.team_user_id = u.id
       WHERE r.competition_id = $1 AND r.status = 'APPROVED'`,
      [existingTask.competition_id]
    );
    const teamEmails = teams.rows.map(r => r.email);
    if (teamEmails.length) await sendTaskPublished(teamEmails, updatedTask);
  }

  res.json({ success: true, task: updatedTask });
};

// GET /api/tasks/:id/submissions — Admin: View all team submissions for a task
const getTaskSubmissions = async (req, res) => {
  const result = await pool.query(
    `SELECT s.*, u.name as team_name, r.college_name, r.vehicle_class
     FROM submissions s
     JOIN users u ON u.id = s.team_id
     JOIN registrations r ON r.team_user_id = u.id
     WHERE s.task_id = $1
     ORDER BY s.submitted_at DESC`,
    [req.params.id]
  );
  res.json({ success: true, submissions: result.rows });
};

// GET /api/tasks/competition/:id/weight — Admin: Check total weight
const getWeightStatus = async (req, res) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(weight),0) as total_weight,
            COUNT(*) FILTER (WHERE status='PUBLISHED') as published_count,
            COUNT(*) as total_count
     FROM tasks WHERE competition_id = $1`,
    [req.params.id]
  );
  res.json({ success: true, ...result.rows[0] });
};

// DELETE /api/tasks/:id — Admin: Delete task
const deleteTask = async (req, res) => {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
  logger.info(`Task deleted: ${result.rows[0].name} by ${req.user.email}`);
  res.json({ success: true, message: 'Task deleted' });
};

module.exports = { 
  getTasks, 
  getTask, 
  createTask, 
  updateTask, 
  getTaskSubmissions, 
  getWeightStatus,
  deleteTask 
};
