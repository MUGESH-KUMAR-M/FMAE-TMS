const pool = require('../config/database');
const logger = require('../utils/logger');

// GET /api/competitions — All active competitions (public for registration dropdown)
const getCompetitions = async (req, res) => {
  const statusFilter = req.query.status || 'ACTIVE';
  const result = await pool.query(
    `SELECT c.*, 
            json_agg(json_build_object('id',d.id,'label',d.label,'date',d.deadline_date) 
                     ORDER BY d.deadline_date) FILTER (WHERE d.id IS NOT NULL) as deadlines
     FROM competitions c
     LEFT JOIN competition_deadlines d ON d.competition_id = c.id
     WHERE c.status = $1
     GROUP BY c.id
     ORDER BY c.code`,
    [statusFilter]
  );
  res.json({ success: true, competitions: result.rows });
};

// GET /api/competitions/:id
const getCompetition = async (req, res) => {
  const result = await pool.query(
    `SELECT c.*,
            json_agg(json_build_object('id',d.id,'label',d.label,'date',d.deadline_date)
                     ORDER BY d.deadline_date) FILTER (WHERE d.id IS NOT NULL) as deadlines
     FROM competitions c
     LEFT JOIN competition_deadlines d ON d.competition_id = c.id
     WHERE c.id = $1 GROUP BY c.id`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Competition not found' });
  res.json({ success: true, competition: result.rows[0] });
};

// POST /api/competitions — Admin: Create competition
const createCompetition = async (req, res) => {
  const { code, name, vehicle_class, description, rules, start_date, end_date, status, deadlines } = req.body;
  if (!code || !name || !vehicle_class)
    return res.status(400).json({ success: false, message: 'Code, name, and vehicle class are required' });

  const result = await pool.query(
    `INSERT INTO competitions (code, name, vehicle_class, description, rules, start_date, end_date, status, admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [code, name, vehicle_class, description, rules, start_date, end_date, status || 'DRAFT', req.user.id]
  );
  const comp = result.rows[0];

  if (deadlines && Array.isArray(deadlines)) {
    for (const d of deadlines) {
      if (d.label && d.deadline_date) {
        await pool.query(
          `INSERT INTO competition_deadlines (competition_id, label, deadline_date) VALUES ($1,$2,$3)`,
          [comp.id, d.label, d.deadline_date]
        );
      }
    }
  }
  logger.info(`Competition created: ${code} by ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Competition created', competition: comp });
};

// PUT /api/competitions/:id — Admin: Update competition
const updateCompetition = async (req, res) => {
  const { name, vehicle_class, description, rules, start_date, end_date, status, deadlines } = req.body;
  const result = await pool.query(
    `UPDATE competitions SET name=COALESCE($1,name), vehicle_class=COALESCE($2,vehicle_class),
     description=COALESCE($3,description), rules=COALESCE($4,rules),
     start_date=COALESCE($5,start_date), end_date=COALESCE($6,end_date),
     status=COALESCE($7,status), updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [name, vehicle_class, description, rules, start_date, end_date, status, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Competition not found' });

  if (deadlines && Array.isArray(deadlines)) {
    await pool.query(`DELETE FROM competition_deadlines WHERE competition_id = $1`, [req.params.id]);
    for (const d of deadlines) {
      if (d.label && d.deadline_date) {
        await pool.query(
          `INSERT INTO competition_deadlines (competition_id, label, deadline_date) VALUES ($1,$2,$3)`,
          [req.params.id, d.label, d.deadline_date]
        );
      }
    }
  }
  res.json({ success: true, message: 'Competition updated', competition: result.rows[0] });
};

// GET /api/competitions/admin/all — Super Admin: All competitions across system
const getAllCompetitionsAdmin = async (req, res) => {
  const result = await pool.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM registrations r WHERE r.competition_id=c.id) as total_registrations,
            (SELECT COUNT(*) FROM registrations r WHERE r.competition_id=c.id AND r.status='APPROVED') as approved_teams,
            (SELECT COUNT(*) FROM tasks t WHERE t.competition_id=c.id) as total_tasks
     FROM competitions c ORDER BY c.created_at DESC`
  );
  res.json({ success: true, competitions: result.rows });
};

// DELETE /api/competitions/:id — Admin: Delete competition
const deleteCompetition = async (req, res) => {
  const result = await pool.query('DELETE FROM competitions WHERE id = $1 RETURNING *', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Competition not found' });
  logger.info(`Competition deleted: ${result.rows[0].code} by ${req.user.email}`);
  res.json({ success: true, message: 'Competition deleted' });
};

module.exports = { 
  getCompetitions, 
  getCompetition, 
  createCompetition, 
  updateCompetition, 
  getAllCompetitionsAdmin,
  deleteCompetition 
};
