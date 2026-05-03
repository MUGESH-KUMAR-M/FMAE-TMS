const express = require('express');
const router = express.Router();
const { login, refresh, changePassword, forgotPassword, resetPassword, getMe, firebaseAuth, linkFirebaseAccount } = require('../controllers/AuthController');
const { authMiddleware } = require('../middleware/auth');

// Traditional JWT routes
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and Token Management
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: team@college.edu }
 *               password: { type: string, example: 123456 }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', authMiddleware, getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/change-password', authMiddleware, changePassword);

/**
 * @swagger
 * /api/auth/firebase:
 *   post:
 *     summary: Firebase Authentication
 *     tags: [Auth]
 */
router.post('/firebase', firebaseAuth);

/**
 * @swagger
 * /api/auth/firebase/link:
 *   post:
 *     summary: Link Firebase account to existing user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/firebase/link', authMiddleware, linkFirebaseAccount);

module.exports = router;
