const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendPasswordReset } = require('../utils/emailService');
const logger = require('../utils/logger');
const FirebaseAuthService = require('../services/FirebaseAuthService');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, competition_id: user.competition_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (!user.is_active) return res.status(403).json({ success: false, message: 'Account is deactivated' });

  // TEAM USERS: Check if registration is approved
  if (user.role === 'TEAM') {
    const regCheck = await pool.query(
      `SELECT status FROM registrations WHERE team_user_id = $1 AND status = 'APPROVED'`,
      [user.id]
    );
    if (!regCheck.rows[0]) {
      logger.warn(`[AUTH] Denied login for team ${user.email} - registration not approved`);
      return res.status(403).json({ 
        success: false, 
        message: 'Your team registration has not been approved yet. Please wait for admin approval.' 
      });
    }
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  await pool.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  logger.info(`[AUTH] Login: ${user.email} [${user.role}]`);
  res.json({
    success: true,
    token,
    refreshToken,
    user: {
      id: user.id, 
      name: user.name, 
      email: user.email,
      role: user.role, 
      competition_id: user.competition_id,
      is_temp_password: user.is_temp_password,
    },
  });
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await pool.query(`SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [decoded.id]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    res.json({ success: true, token: generateToken(user) });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
  }

  const result = await pool.query(
    `SELECT password, is_temp_password FROM users WHERE id = $1`, 
    [userId]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

  // Validate new password
  if (newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

  // Password strength validation
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumbers = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password must contain uppercase, lowercase, and numbers' 
    });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password = $1, is_temp_password = FALSE, updated_at = NOW() WHERE id = $2`, 
    [hashed, userId]
  );
  
  logger.info(`[AUTH] Password changed for user: ${req.user.email}`);
  res.json({ success: true, message: 'Password changed successfully' });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await pool.query(`SELECT id FROM users WHERE email = $1`, [email?.toLowerCase()]);
  // Always return success to prevent email enumeration
  if (result.rows[0]) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [result.rows[0].id, token, expires]
    );
    await sendPasswordReset(email, token);
  }
  res.json({ success: true, message: 'If an account exists, a reset email has been sent' });
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ success: false, message: 'Token and new password required' });
  const result = await pool.query(
    `SELECT * FROM password_resets WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token]
  );
  if (!result.rows[0]) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  const reset = result.rows[0];
  if (newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password = $1, is_temp_password = FALSE, updated_at = NOW() WHERE id = $2`, [hashed, reset.user_id]);
  await pool.query(`UPDATE password_resets SET used = TRUE WHERE id = $1`, [reset.id]);
  res.json({ success: true, message: 'Password reset successfully' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.competition_id, u.is_temp_password, u.last_login,
            c.name as competition_name, c.code as competition_code
     FROM users u
     LEFT JOIN competitions c ON c.id = u.competition_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json({ success: true, user: result.rows[0] });
};

// POST /api/auth/firebase - Firebase authentication
const firebaseAuth = async (req, res) => {
  try {
    const { idToken, expectedRole } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token required' });
    }

    const result = await FirebaseAuthService.verifyFirebaseToken(idToken, expectedRole);
    
    // Get refresh token for convenience
    const user = result.user;
    const refreshToken = generateRefreshToken(user);

    logger.info(`[AUTH] Firebase Login: ${user.email} [${user.role}]`);
    
    res.json({
      success: true,
      token: result.token,
      refreshToken,
      user,
      generatedPassword: result.generatedPassword,
    });
  } catch (error) {
    logger.error('[AUTH] Firebase authentication failed:', error.message);
    res.status(401).json({
      success: false,
      message: error.message || 'Firebase authentication failed',
    });
  }
};

// POST /api/auth/firebase/link - Link Firebase account to existing user
const linkFirebaseAccount = async (req, res) => {
  try {
    const { idToken } = req.body;
    const userId = req.user.id;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token required' });
    }

    const result = await FirebaseAuthService.linkFirebaseAccount(userId, idToken);

    logger.info(`Firebase Account Linked: User ${userId}`);

    res.json({
      success: true,
      message: 'Firebase account linked successfully',
      user: result,
    });
  } catch (error) {
    logger.error('Firebase link failed:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to link Firebase account',
    });
  }
};

module.exports = { login, refresh, changePassword, forgotPassword, resetPassword, getMe, firebaseAuth, linkFirebaseAccount };
