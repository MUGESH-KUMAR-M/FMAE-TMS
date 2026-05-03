const express = require('express');
const router = express.Router();
const { downloadCertificate } = require('../controllers/CertificateController');
const { authMiddleware, isTeam } = require('../middleware/auth');

router.get('/download', authMiddleware, isTeam, downloadCertificate);

module.exports = router;
