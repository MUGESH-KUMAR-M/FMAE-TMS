const pool = require('../config/database');
const { sendPaymentConfirmation } = require('../utils/emailService');
const logger = require('../utils/logger');
const NotificationController = require('./NotificationController');

// GET /api/payments — Finance Admin: Get all teams with payment status
const getAllPayments = async (req, res) => {
  const { competition_id, status, page = 1, limit = 20 } = req.query;
  let conditions = [`r.status = 'APPROVED'`];
  let params = [];
  let idx = 1;

  if (competition_id) { conditions.push(`r.competition_id = $${idx++}`); params.push(competition_id); }
  if (status) { conditions.push(`ps.status = $${idx++}`); params.push(status); }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM registrations r
     LEFT JOIN payment_status ps ON ps.registration_id = r.id
     WHERE ${conditions.join(' AND ')}`, params
  );

  const result = await pool.query(
    `SELECT r.id as registration_id, r.team_name, r.college_name, r.team_email,
            r.vehicle_class, r.submitted_at as reg_date,
            c.name as competition_name, c.code as competition_code,
            ps.id as payment_id, ps.status as payment_status, ps.marked_at, ps.notes,
            pu.name as marked_by_name,
            -- Billing details for Finance Admin
            r.billing_name, r.billing_address_line1, r.billing_address_line2,
            r.billing_city, r.billing_state, r.billing_pin, r.billing_gst
     FROM registrations r
     JOIN competitions c ON c.id = r.competition_id
     LEFT JOIN payment_status ps ON ps.registration_id = r.id
     LEFT JOIN users pu ON pu.id = ps.marked_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.submitted_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    payments: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
    summary: {
      total: parseInt(countResult.rows[0].count),
    },
  });
};

// PUT /api/payments/:id — Finance Admin: Update payment status
// Gap Fix: 3 states — PAID | UNPAID | PENDING
const updatePayment = async (req, res) => {
  const { status, notes } = req.body;
  if (!['PAID', 'UNPAID', 'PENDING'].includes(status))
    return res.status(400).json({ success: false, message: 'Status must be PAID, UNPAID, or PENDING' });

  const existing = await pool.query(`SELECT * FROM payment_status WHERE id = $1`, [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Payment record not found' });

  const result = await pool.query(
    `UPDATE payment_status SET status=$1, notes=$2, marked_by=$3, marked_at=NOW(), updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [status, notes, req.user.id, req.params.id]
  );

  if (status === 'PAID' && existing.rows[0].status !== 'PAID') {
    const regResult = await pool.query(
      `SELECT r.team_name, r.team_email, r.team_user_id, c.name as competition_name
       FROM registrations r JOIN competitions c ON c.id = r.competition_id
       WHERE r.id = $1`,
      [existing.rows[0].registration_id]
    );
    if (regResult.rows[0]) {
      const reg = regResult.rows[0];
      await sendPaymentConfirmation(reg.team_email, reg);
      
      if (reg.team_user_id) {
        await NotificationController.createNotification(req.app.get('io'), {
          user_id: reg.team_user_id,
          title: 'Payment Confirmed',
          message: `Your payment for ${reg.competition_name} has been confirmed.`,
          type: 'SUCCESS',
          link: '/team'
        });
      }
    }
  }

  logger.info(`Payment updated: ${existing.rows[0].id} -> ${status} by ${req.user.email}`);
  res.json({ success: true, payment: result.rows[0] });
};

// GET /api/payments/summary — Finance Admin: Dashboard summary stats
const getPaymentSummary = async (req, res) => {
  const { competition_id } = req.query;
  let condition = `r.status = 'APPROVED'`;
  let params = [];
  if (competition_id) { condition += ` AND r.competition_id = $1`; params.push(competition_id); }

  const result = await pool.query(
    `SELECT
       COUNT(*) as total_teams,
       COUNT(*) FILTER (WHERE ps.status = 'PAID') as paid,
       COUNT(*) FILTER (WHERE ps.status = 'UNPAID') as unpaid,
       COUNT(*) FILTER (WHERE ps.status = 'PENDING' OR ps.status IS NULL) as pending
     FROM registrations r
     LEFT JOIN payment_status ps ON ps.registration_id = r.id
     WHERE ${condition}`,
    params
  );
  res.json({ success: true, summary: result.rows[0] });
};

// GET /api/payments/export — Finance Admin: Export to CSV
const exportPaymentsCSV = async (req, res) => {
  const { competition_id } = req.query;
  let condition = `r.status = 'APPROVED'`;
  let params = [];
  if (competition_id) { condition += ` AND r.competition_id = $1`; params.push(competition_id); }

  const result = await pool.query(
    `SELECT r.team_name, r.college_name, r.team_email, r.vehicle_class,
            c.name as competition, c.code as competition_code,
            ps.status as payment_status, ps.marked_at,
            r.billing_name, r.billing_gst, r.billing_city, r.billing_state, r.billing_pin,
            r.submitted_at
     FROM registrations r JOIN competitions c ON c.id = r.competition_id
     LEFT JOIN payment_status ps ON ps.registration_id = r.id
     WHERE ${condition} ORDER BY c.name, r.team_name`,
    params
  );

  const csvHeaders = [
    'Team Name','College','Email','Competition','Class','Payment Status',
    'Billing Name','GST Number','City','State','PIN','Submitted At','Payment Marked At'
  ].join(',');

  const csvRows = result.rows.map(r => [
    `"${r.team_name}"`, `"${r.college_name}"`, r.team_email,
    `"${r.competition}"`, r.vehicle_class, r.payment_status || 'PENDING',
    `"${r.billing_name || ''}"`, r.billing_gst || '', r.billing_city || '',
    r.billing_state || '', r.billing_pin || '',
    r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-IN') : '',
    r.marked_at ? new Date(r.marked_at).toLocaleDateString('en-IN') : '',
  ].join(','));

  const csv = [csvHeaders, ...csvRows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=fmae_payments.csv');
  res.send(csv);
};

// GET /api/payments/my — Team: Get own payment status
const getMyPayment = async (req, res) => {
  const result = await pool.query(
    `SELECT ps.status, ps.marked_at, ps.notes FROM payment_status ps
     JOIN registrations r ON r.id = ps.registration_id
     WHERE r.team_user_id = $1`,
    [req.user.id]
  );
  res.json({ success: true, payment: result.rows[0] || { status: 'PENDING' } });
};

module.exports = { 
  getAllPayments, updatePayment, getPaymentSummary, 
  exportPaymentsCSV, getMyPayment
};
