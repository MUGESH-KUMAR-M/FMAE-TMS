const express = require('express');
const router = express.Router();
const { getAllPayments, updatePayment, getPaymentSummary, exportPaymentsCSV, getMyPayment } = require('../controllers/PaymentController');
const { authMiddleware, isFinanceAdmin, isTeam, isAnyRole } = require('../middleware/auth');

router.get('/', authMiddleware, isFinanceAdmin, getAllPayments);
router.get('/summary', authMiddleware, isFinanceAdmin, getPaymentSummary);
router.get('/export', authMiddleware, isFinanceAdmin, exportPaymentsCSV);
router.get('/my', authMiddleware, isTeam, getMyPayment);
router.put('/:id', authMiddleware, isFinanceAdmin, updatePayment);

module.exports = router;
