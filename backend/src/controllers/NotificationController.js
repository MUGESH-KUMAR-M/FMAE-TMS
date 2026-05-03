const pool = require('../config/database');
const logger = require('../utils/logger');

// Create a notification and emit via socket
const createNotification = async (io, notification) => {
  const { user_id, title, message, type, link } = notification;
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, title, message, type || 'INFO', link]
    );
    
    if (io) {
      io.to(`user-${user_id}`).emit('notification', result.rows[0]);
    }
    return result.rows[0];
  } catch (err) {
    logger.error('Error creating notification:', err);
  }
};

const getMyNotifications = async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({ success: true, notifications: result.rows });
};

const markAsRead = async (req, res) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
};

const markAllRead = async (req, res) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
    [req.user.id]
  );
  res.json({ success: true });
};

module.exports = { createNotification, getMyNotifications, markAsRead, markAllRead };
