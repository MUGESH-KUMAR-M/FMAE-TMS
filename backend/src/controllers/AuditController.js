const pool = require('../config/database');

// GET /api/audit — Super Admin: Get recent audit logs
const getAuditLogs = async (req, res) => {
  const result = await pool.query(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM audit_logs a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT 50`
  );
  res.json({ success: true, logs: result.rows });
};

module.exports = { getAuditLogs };
