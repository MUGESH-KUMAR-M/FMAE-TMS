const express = require('express');
const router = express.Router();
const { 
  getTasks, 
  getTask, 
  createTask, 
  updateTask, 
  getTaskSubmissions, 
  getWeightStatus,
  deleteTask
} = require('../controllers/TaskController');
const { authMiddleware, isCompAdmin, isAnyRole } = require('../middleware/auth');
const auditLog = require('../middleware/audit');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management and submissions
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get tasks
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: competition_id
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, PUBLISHED] }
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', authMiddleware, isAnyRole, getTasks);

/**
 * @swagger
 * /api/tasks/weight/{id}:
 *   get:
 *     summary: Check total weight of tasks for a competition
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Weight status
 */
router.get('/weight/:id', authMiddleware, isCompAdmin, getWeightStatus);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Task details
 *   put:
 *     summary: Update task (Admin)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Task updated
 *   delete:
 *     summary: Delete task (Admin)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.get('/:id', authMiddleware, isAnyRole, getTask);

/**
 * @swagger
 * /api/tasks/{id}/submissions:
 *   get:
 *     summary: Get all submissions for a task (Admin)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of submissions
 */
router.get('/:id/submissions', authMiddleware, isCompAdmin, getTaskSubmissions);
router.post('/', authMiddleware, isCompAdmin, auditLog('CREATE_TASK', 'TASK'), createTask);
router.put('/:id', authMiddleware, isCompAdmin, auditLog('UPDATE_TASK', 'TASK'), updateTask);
router.delete('/:id', authMiddleware, isCompAdmin, auditLog('DELETE_TASK', 'TASK'), deleteTask);

module.exports = router;
