const express = require('express');
const router = express.Router();
const { uploadSubmission, getMySubmissions, downloadSubmission, deleteSubmission } = require('../controllers/SubmissionController');
const { authMiddleware, isTeam, isAnyRole, isCompAdmin } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Task file submissions
 */

/**
 * @swagger
 * /api/submissions/tasks/{taskId}:
 *   post:
 *     summary: Upload file submission for a task
 *     tags: [Submissions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/tasks/:taskId', authMiddleware, isTeam, upload.single('file'), uploadSubmission);

/**
 * @swagger
 * /api/submissions/my:
 *   get:
 *     summary: Get my team's submissions
 *     tags: [Submissions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/my', authMiddleware, isTeam, getMySubmissions);

/**
 * @swagger
 * /api/submissions/{id}/download:
 *   get:
 *     summary: Download submission file
 *     tags: [Submissions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/download', authMiddleware, isAnyRole, downloadSubmission);

/**
 * @swagger
 * /api/submissions/{id}:
 *   delete:
 *     summary: Delete submission (Admin)
 *     tags: [Submissions]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', authMiddleware, isCompAdmin, deleteSubmission);

module.exports = router;
