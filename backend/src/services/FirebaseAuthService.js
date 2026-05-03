const { auth } = require('../config/firebase');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class FirebaseAuthService {
  /**
   * Verify Firebase ID token and authenticate/create user
   * @param {string} idToken - Firebase ID token from frontend
   * @param {string} expectedRole - Expected role for new user (for Super Admin)
   * @returns {object} User and JWT token
   */
  static async verifyFirebaseToken(idToken, expectedRole = null) {
    try {
      // Verify the Firebase token
      const decodedToken = await auth.verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      logger.info('[FIREBASE] Token verified', { uid, email });

      // Check if user exists in database
      let user = await User.findByEmail(email);
      let generatedPassword = null;

      if (user) {
        // Update Firebase UID if not already set
        if (!user.firebase_uid) {
          await User.updateFirebaseUid(user.id, uid);
          user.firebase_uid = uid;
        }
        // Super Admin Google login should not force password reset
        if (user.role === 'SUPER_ADMIN' && user.is_temp_password) {
          user = await User.setTempPasswordFlag(user.id, false);
        }
        logger.info('[FIREBASE] Existing user logged in', { userId: user.id, email });
      } else {
        // Create new user from Firebase profile
        generatedPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Determine role - Super Admin ONLY via Google OAuth, others cannot be created via OAuth
        let userRole = expectedRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'TEAM';
        
        // For non-SUPER_ADMIN roles, reject creation via Google
        if (expectedRole && expectedRole !== 'SUPER_ADMIN') {
          logger.warn('[FIREBASE] Cannot create user via Google OAuth for role', { email, role: expectedRole });
          throw new Error(`Users with role ${expectedRole} must be created by Super Admin. Please contact your administrator.`);
        }

        const newUser = {
          name: name || email.split('@')[0],
          email,
          password: hashedPassword,
          firebase_uid: uid,
          profile_picture: picture,
          role: userRole,
          is_temp_password: false,
          is_active: true,
        };

        user = await User.createFirebaseUser(newUser);
        logger.info('[FIREBASE] New user created via Google OAuth', { 
          userId: user.id, 
          email, 
          role: userRole,
          tempPasswordRequired: false
        });
      }

      // Generate JWT token for API access
      const jwtToken = this.generateJWTToken(user);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile_picture: user.profile_picture,
          firebase_uid: user.firebase_uid,
          is_temp_password: user.is_temp_password,
        },
        token: jwtToken,
        generatedPassword: null,
      };
    } catch (error) {
      logger.error('[FIREBASE] Token verification failed', { error: error.message });
      throw new Error('Firebase authentication failed: ' + error.message);
    }
  }

  /**
   * Generate JWT token for user
   * @param {object} user - User object
   * @returns {string} JWT token
   */
  static generateJWTToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firebase_uid: user.firebase_uid,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Link Firebase account to existing user
   * @param {number} userId - User ID
   * @param {string} idToken - Firebase ID token
   * @returns {object} Updated user
   */
  static async linkFirebaseAccount(userId, idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const { uid } = decodedToken;

      const user = await User.updateFirebaseUid(userId, uid);
      logger.info('Firebase account linked', { userId, firebase_uid: uid });

      return user;
    } catch (error) {
      logger.error('Failed to link Firebase account', { error: error.message });
      throw new Error('Failed to link Firebase account: ' + error.message);
    }
  }

  /**
   * Create Firebase user account
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {object} Firebase user record
   */
  static async createFirebaseUser(email, password, displayName) {
    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });
      logger.info('Firebase user created', { uid: userRecord.uid, email });
      return userRecord;
    } catch (error) {
      logger.error('Firebase user creation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Reset password via Firebase
   * @param {string} email - User email
   * @returns {string} Reset link (from Firebase)
   */
  static async sendPasswordResetEmail(email) {
    try {
      const resetLink = await auth.generatePasswordResetLink(email);
      logger.info('Password reset link generated', { email });
      return resetLink;
    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = FirebaseAuthService;
