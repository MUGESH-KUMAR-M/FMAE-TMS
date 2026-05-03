const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/AuditController');
const { authMiddleware, isSuperAdmin } = require('../middleware/auth');

router.get('/', authMiddleware, isSuperAdmin, getAuditLogs);

module.exports = router;
