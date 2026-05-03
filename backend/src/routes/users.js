const express = require('express');
const router = express.Router();
const { 
  getAllUsers, 
  createUser, 
  toggleUserActive, 
  resetUserPassword, 
  updateUser, 
  getSystemStats,
  deleteUser
} = require('../controllers/UserController');
const { authMiddleware, isSuperAdmin, isCompAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: System user management (Super Admin)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Create a new system user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authMiddleware, isCompAdmin, getAllUsers);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get global system statistics
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/stats', authMiddleware, isSuperAdmin, getSystemStats);

router.post('/', authMiddleware, isCompAdmin, createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', authMiddleware, isCompAdmin, updateUser);
router.delete('/:id', authMiddleware, isCompAdmin, deleteUser);

/**
 * @swagger
 * /api/users/{id}/toggle-active:
 *   post:
 *     summary: Toggle user active status
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/toggle-active', authMiddleware, isCompAdmin, toggleUserActive);

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password (temp password generated)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/reset-password', authMiddleware, isCompAdmin, resetUserPassword);

module.exports = router;
