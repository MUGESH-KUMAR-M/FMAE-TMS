const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware to verify if the authenticated admin has access to a specific competition.
 * @param {Function} getCompIdFn - Function to extract competition_id from the request.
 */
const verifyCompetitionAccess = (getCompIdFn) => async (req, res, next) => {
  try {
    // Super Admins can access everything
    if (req.user.role === 'SUPER_ADMIN') return next();

    const competitionId = await getCompIdFn(req);
    
    if (!competitionId) {
      // If no competition ID is provided in the request, and the user is an ADMIN_COMPETITION,
      // they might be trying to access something they shouldn't or the request is missing info.
      return res.status(400).json({ success: false, message: 'Competition ID is required for scoping' });
    }

    // Admins assigned to a competition can only access their assigned competition
    if (req.user.role === 'ADMIN_COMPETITION') {
      if (req.user.competition_id && String(req.user.competition_id) !== String(competitionId)) {
        logger.warn(`Scoping Access Denied: Admin ${req.user.email} attempted to access Competition ${competitionId}`);
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this competition' });
      }
    }

    next();
  } catch (err) {
    logger.error(`Scoping Middleware Error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error in scoping check' });
  }
};

module.exports = { verifyCompetitionAccess };
