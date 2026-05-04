const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const NotificationController = require('./NotificationController');

// POST /api/submissions/tasks/:taskId — Team: Upload file submission
const uploadSubmission = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const { taskId } = req.params;
  const teamId = req.user.id;

  // Get team's registration
  const regResult = await pool.query(
    `SELECT r.id, r.competition_id FROM registrations r WHERE r.team_user_id = $1 AND r.status = 'APPROVED'`,
    [teamId]
  );
  if (!regResult.rows[0]) return res.status(403).json({ success: false, message: 'No approved registration found' });
  const reg = regResult.rows[0];

  // Verify task belongs to this team's competition
  const task = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  if (!task.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
  if (task.rows[0].competition_id !== reg.competition_id)
    return res.status(403).json({ success: false, message: 'Task not in your competition' });
  if (task.rows[0].task_type !== 'SUBMISSION')
    return res.status(400).json({ success: false, message: 'This task does not accept file submissions' });

  // Upsert submission (replace if already submitted)
  const fileUrl = `/uploads/task_${taskId}/${req.file.filename}`;
  const result = await pool.query(
    `INSERT INTO submissions (team_id, task_id, registration_id, file_url, file_name, file_size, file_type, status, submitted_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'SUBMITTED',NOW(),NOW())
     ON CONFLICT (team_id, task_id) DO UPDATE
     SET file_url=$4, file_name=$5, file_size=$6, file_type=$7, status='SUBMITTED', submitted_at=NOW(), updated_at=NOW()
     RETURNING *`,
    [teamId, taskId, reg.id, fileUrl, req.file.originalname, req.file.size, req.file.mimetype]
  );

  logger.info(`Submission: Team ${teamId} submitted task ${taskId}`);

  // Notify Admins
  const adminsToNotify = await pool.query(
    `SELECT id FROM users 
     WHERE role = 'SUPER_ADMIN' 
     OR (role = 'ADMIN_COMPETITION' AND competition_id = $1)`,
    [reg.competition_id]
  );
  const io = req.app.get('io');
  for (const admin of adminsToNotify.rows) {
    await NotificationController.createNotification(io, {
      user_id: admin.id,
      title: 'New Task Submission',
      message: `Team "${req.user.name}" submitted "${task.rows[0].name}".`,
      type: 'INFO',
      link: `/admin/registrations/${reg.id}`
    });
  }

  res.status(201).json({ success: true, submission: result.rows[0] });
};

// GET /api/submissions/my — Team: Get all own submissions
const getMySubmissions = async (req, res) => {
  const result = await pool.query(
    `SELECT s.*, t.name as task_name, t.task_type, t.weight, t.due_date
     FROM submissions s
     JOIN tasks t ON t.id = s.task_id
     WHERE s.team_id = $1
     ORDER BY s.submitted_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, submissions: result.rows });
};

// GET /api/submissions/:id/download — Admin or Team: Download submitted file
const downloadSubmission = async (req, res) => {
  const result = await pool.query(
    `SELECT s.*, r.competition_id FROM submissions s 
     JOIN registrations r ON r.id = s.registration_id 
     WHERE s.id = $1`, 
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Submission not found' });
  const submission = result.rows[0];

  // Access control: team can only download their own
  if (req.user.role === 'TEAM' && submission.team_id !== req.user.id)
    return res.status(403).json({ success: false, message: 'Forbidden' });

  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && submission.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this submission' });
  }

  const filePath = path.join(process.cwd(), submission.file_url);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ success: false, message: 'File not found on server' });

  res.download(filePath, submission.file_name);
};

// DELETE /api/submissions/:id — Admin: Delete submission
const deleteSubmission = async (req, res) => {
  const result = await pool.query(
    `SELECT s.*, r.competition_id 
     FROM submissions s JOIN registrations r ON r.id = s.registration_id 
     WHERE s.id = $1`, 
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Submission not found' });
  
  const submission = result.rows[0];

  // Scoping check for Competition Admins
  if (req.user.role === 'ADMIN_COMPETITION' && req.user.competition_id && submission.competition_id !== req.user.competition_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this submission' });
  }
  const filePath = path.join(process.cwd(), submission.file_url);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  logger.info(`Submission deleted: Task ${submission.task_id} for Team ${submission.team_id} by ${req.user.email}`);
  res.json({ success: true, message: 'Submission deleted' });
};

module.exports = { uploadSubmission, getMySubmissions, downloadSubmission, deleteSubmission };
