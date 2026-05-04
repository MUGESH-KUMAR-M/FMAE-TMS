const express = require('express');
const router = express.Router();
const { enterTrackValue, getTaskTrackEvents, approveTrackEvent, getMyTrackEvents, getApprovedValues, deleteTrackEvent } = require('../controllers/TrackEventController');
const { authMiddleware, isCompAdmin, isTeam, isJudge, isAnyRole } = require('../middleware/auth');

// Attach io to req for socket emit on approve
router.use((req, res, next) => {
  req.io = req.app.get('io');
  next();
});

/**
 * @swagger
 * tags:
 *   name: TrackEvents
 *   description: On-track event scoring
 */

/**
 * @swagger
 * /api/track-events/tasks/{taskId}/enter:
 *   post:
 *     summary: Enter track event value for a team (Admin)
 *     tags: [TrackEvents]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/tasks/:taskId/enter', authMiddleware, isCompAdmin, enterTrackValue);

/**
 * @swagger
 * /api/track-events/tasks/{taskId}/teams:
 *   get:
 *     summary: Get all team values for a task (Admin)
 *     tags: [TrackEvents]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/tasks/:taskId/teams', authMiddleware, isCompAdmin, getTaskTrackEvents);

/**
 * @swagger
 * /api/track-events/my:
 *   get:
 *     summary: Get my team's track event entries
 *     tags: [TrackEvents]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/my', authMiddleware, isTeam, getMyTrackEvents);
router.get('/approved-values', authMiddleware, isAnyRole, getApprovedValues);

/**
 * @swagger
 * /api/track-events/{id}/approve:
 *   post:
 *     summary: Approve track event value (Team)
 *     tags: [TrackEvents]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/approve', authMiddleware, isTeam, approveTrackEvent);

/**
 * @swagger
 * /api/track-events/{id}:
 *   delete:
 *     summary: Delete track event entry (Admin)
 *     tags: [TrackEvents]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', authMiddleware, isCompAdmin, deleteTrackEvent);

module.exports = router;
