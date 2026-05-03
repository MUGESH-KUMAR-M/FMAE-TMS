const express = require('express');
const router = express.Router();
const { 
  getCompetitions, 
  getCompetition, 
  createCompetition, 
  updateCompetition, 
  getAllCompetitionsAdmin,
  deleteCompetition
} = require('../controllers/CompetitionController');
const { authMiddleware, isCompAdmin, isSuperAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Competitions
 *   description: Competition management and retrieval
 */

/**
 * @swagger
 * /api/competitions:
 *   get:
 *     summary: Get all active competitions
 *     tags: [Competitions]
 *     responses:
 *       200:
 *         description: List of active competitions
 */
router.get('/', getCompetitions);

/**
 * @swagger
 * /api/competitions/admin/all:
 *   get:
 *     summary: Get all competitions (Super Admin)
 *     tags: [Competitions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of all competitions
 */
router.get('/admin/all', authMiddleware, isSuperAdmin, getAllCompetitionsAdmin);

/**
 * @swagger
 * /api/competitions/{id}:
 *   get:
 *     summary: Get competition by ID
 *     tags: [Competitions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Competition details
 *   put:
 *     summary: Update competition (Admin)
 *     tags: [Competitions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Competition updated
 *   delete:
 *     summary: Delete competition (Super Admin)
 *     tags: [Competitions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Competition deleted
 */
router.get('/:id', getCompetition);                                    // Public: single competition
router.post('/', authMiddleware, isCompAdmin, createCompetition);
router.put('/:id', authMiddleware, isCompAdmin, updateCompetition);
router.delete('/:id', authMiddleware, isSuperAdmin, deleteCompetition);

module.exports = router;
