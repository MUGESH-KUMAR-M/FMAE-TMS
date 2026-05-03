const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class GoogleAuthService {
  /**
   * Verify Google token and authenticate/create user
   * @param {string} token - Google ID token from frontend
   * @returns {object} User and JWT token
   */
  static async verifyGoogleToken(token) {
    try {
      // Verify the Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name, picture, sub: googleId } = payload;

      logger.info('Google token verified', { email, googleId });

      // Check if user exists
      let user = await User.findByEmail(email);

      if (user) {
        // Update Google ID if not already set
        if (!user.google_id) {
          await User.updateGoogleId(user.id, googleId);
          user.google_id = googleId;
        }
        logger.info('Existing user logged in via Google', { userId: user.id, email });
      } else {
        // Create new user from Google profile
        const newUser = {
          name,
          email,
          password: null, // Google users don't have passwords
          phone: null,
          google_id: googleId,
          profile_picture: picture,
          role: 'viewer', // Default role
        };

        user = await User.createGoogleUser(newUser);
        logger.info('New user created via Google', { userId: user.id, email });
      }

      // Generate JWT token
      const jwtToken = this.generateJWTToken(user);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile_picture: user.profile_picture,
          phone: user.phone,
        },
        token: jwtToken,
      };
    } catch (error) {
      logger.error('Google token verification failed', { error: error.message });
      throw new Error('Google authentication failed: ' + error.message);
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
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Link Google account to existing user
   * @param {number} userId - User ID
   * @param {string} token - Google ID token
   * @returns {object} Updated user
   */
  static async linkGoogleAccount(userId, token) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: googleId } = payload;

      const user = await User.updateGoogleId(userId, googleId);
      logger.info('Google account linked', { userId, googleId });

      return user;
    } catch (error) {
      logger.error('Failed to link Google account', { error: error.message });
      throw new Error('Failed to link Google account: ' + error.message);
    }
  }
}

module.exports = GoogleAuthService;
