const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');

// ─── Verify JWT Token ─────────────────────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB to ensure account is still active
    const result = await pool.query(
      `SELECT id, name, email, role, competition_id, is_active, is_temp_password FROM users WHERE id = $1`,
      [decoded.id]
    );
    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ─── Role Guards ──────────────────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!roles.includes(req.user.role)) {
    logger.warn(`Access denied: ${req.user.email} (${req.user.role}) attempted ${req.method} ${req.path}`);
    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
  }
  next();
};

const isSuperAdmin = requireRole('SUPER_ADMIN');
const isCompAdmin = requireRole('SUPER_ADMIN', 'ADMIN_COMPETITION');
const isFinanceAdmin = requireRole('SUPER_ADMIN', 'ADMIN_FINANCE');
const isTeam = requireRole('TEAM');
const isJudge = requireRole('SUPER_ADMIN', 'JUDGE');
const isAdmin = requireRole('SUPER_ADMIN', 'ADMIN_COMPETITION', 'ADMIN_FINANCE');
const isAnyRole = requireRole('SUPER_ADMIN', 'ADMIN_COMPETITION', 'ADMIN_FINANCE', 'TEAM', 'JUDGE');

module.exports = {
  authMiddleware,
  requireRole,
  isSuperAdmin,
  isCompAdmin,
  isFinanceAdmin,
  isTeam,
  isJudge,
  isAdmin,
  isAnyRole,
};
