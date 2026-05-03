const pool = require('../config/database');
const logger = require('../utils/logger');

const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    // Capture the request info
    const userId = req.user ? req.user.id : null;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // We only log successful state-changing operations
    res.send = function (data) {
      res.send = originalSend;
      
      // If the request was successful (2xx), log it
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const body = JSON.parse(data);
          const entityId = body.id || (body.task && body.task.id) || (body.registration && body.registration.id) || req.params.id;

          pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, action, entityType, entityId, JSON.stringify(req.body), ip, userAgent]
          ).catch(err => logger.error('Audit Log DB Error:', err));
          
        } catch (e) {
          // data might not be JSON or other errors
        }
      }
      
      return res.send(data);
    };

    next();
  };
};

module.exports = auditLog;
