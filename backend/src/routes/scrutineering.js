const express = require('express');
const router = express.Router();
const { getAllInspections, updateInspection, getMyInspection } = require('../controllers/ScrutineeringController');
const { authMiddleware, isCompAdmin, isTeam } = require('../middleware/auth');

router.get('/', authMiddleware, isCompAdmin, getAllInspections);
router.get('/my', authMiddleware, isTeam, getMyInspection);
router.put('/:id', authMiddleware, isCompAdmin, updateInspection);

module.exports = router;
