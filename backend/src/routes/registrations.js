const express = require('express');
const router = express.Router();
const {
  submitRegistration, 
  getAllRegistrations, 
  getRegistration,
  getRegistrationStatus, 
  getMyRegistration, 
  approveRegistration, 
  rejectRegistration,
  deleteRegistration,
} = require('../controllers/RegistrationController');
const { authMiddleware, isCompAdmin, isSuperAdmin } = require('../middleware/auth');
const auditLog = require('../middleware/audit');

/**
 * @swagger
 * tags:
 *   name: Registrations
 *   description: Team registration management
 */

// Public routes
/**
 * @swagger
 * /api/registrations:
 *   post:
 *     summary: Submit a new team registration
 *     tags: [Registrations]
 *     responses:
 *       201:
 *         description: Registration submitted
 */
router.post('/', submitRegistration);

/**
 * @swagger
 * /api/registrations/status/{id}:
 *   get:
 *     summary: Track registration status (Public)
 *     tags: [Registrations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 */
router.get('/status/:id', getRegistrationStatus);

// Team routes
/**
 * @swagger
 * /api/registrations/my:
 *   get:
 *     summary: Get my team registration (Approved only)
 *     tags: [Registrations]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/my', authMiddleware, getMyRegistration);

// Admin routes
/**
 * @swagger
 * /api/registrations:
 *   get:
 *     summary: Get all registrations (Admin)
 *     tags: [Registrations]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete registration (Super Admin)
 *     tags: [Registrations]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authMiddleware, isCompAdmin, getAllRegistrations);
router.get('/:id', authMiddleware, isCompAdmin, getRegistration);
router.put('/:id/approve', authMiddleware, isCompAdmin, auditLog('APPROVE_REGISTRATION', 'REGISTRATION'), approveRegistration);
router.put('/:id/reject', authMiddleware, isCompAdmin, auditLog('REJECT_REGISTRATION', 'REGISTRATION'), rejectRegistration);
router.delete('/:id', authMiddleware, isSuperAdmin, auditLog('DELETE_REGISTRATION', 'REGISTRATION'), deleteRegistration);

module.exports = router;
