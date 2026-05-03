const express = require('express');
const router = express.Router();
const { getLeaderboard, getMyPosition } = require('../controllers/LeaderboardController');
const { authMiddleware, isAnyRole, isTeam } = require('../middleware/auth');

router.get('/:competitionId', authMiddleware, isAnyRole, getLeaderboard);
router.get('/:competitionId/my', authMiddleware, isTeam, getMyPosition);

module.exports = router;
