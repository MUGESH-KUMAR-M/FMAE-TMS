const pool = require('../config/database');

// GET /api/leaderboard/:competitionId — Team/Judge: Get leaderboard for a competition
// Gap Fix: Separate leaderboards per competition + per vehicle class (EV/IC)
const getLeaderboard = async (req, res) => {
  const { competitionId } = req.params;
  const { vehicle_class } = req.query; // Optional filter: EV or IC

  // Access control: Teams can only see their own competition's leaderboard
  if (req.user.role === 'TEAM') {
    const reg = await pool.query(
      `SELECT competition_id FROM registrations WHERE team_user_id = $1 AND status = 'APPROVED'`,
      [req.user.id]
    );
    if (!reg.rows[0] || reg.rows[0].competition_id !== parseInt(competitionId)) {
      return res.status(403).json({ success: false, message: 'You can only view your own competition leaderboard' });
    }
  }

  let vehicleFilter = '';
  let params = [competitionId];
  if (vehicle_class) { vehicleFilter = `AND r.vehicle_class = $2`; params.push(vehicle_class); }

  // Score-based leaderboard: sum of approved track event scores
  const result = await pool.query(
    `SELECT
       r.team_name,
       r.college_name,
       r.vehicle_class,
       u.id as team_id,
       -- Score from approved track events
       COALESCE(SUM(te.score) FILTER (WHERE te.approved = TRUE), 0) as total_score,
       -- Progress %: submission tasks (on upload) + track events (on approve)
       COALESCE(SUM(t.weight) FILTER (
         WHERE (t.task_type='SUBMISSION' AND s.status IN ('SUBMITTED','VIEWED'))
            OR (t.task_type='TRACK_EVENT' AND te.approved=TRUE)
       ), 0) as progress_pct,
       COUNT(te.id) FILTER (WHERE te.approved = TRUE) as approved_events
     FROM registrations r
     JOIN users u ON u.id = r.team_user_id
     JOIN competitions c ON c.id = r.competition_id
     -- Left join all tasks for this competition
     LEFT JOIN tasks t ON t.competition_id = r.competition_id AND t.status = 'PUBLISHED'
     LEFT JOIN submissions s ON s.team_id = u.id AND s.task_id = t.id
     LEFT JOIN track_events te ON te.team_id = u.id AND te.task_id = t.id
     WHERE r.competition_id = $1 AND r.status = 'APPROVED' ${vehicleFilter}
     GROUP BY r.team_name, r.college_name, r.vehicle_class, u.id
     ORDER BY total_score DESC, progress_pct DESC, r.team_name ASC`,
    params
  );

  // Add rank
  const ranked = result.rows.map((row, idx) => ({
    rank: idx + 1,
    ...row,
    is_current_team: req.user.role === 'TEAM' && row.team_id === req.user.id,
  }));

  res.json({
    success: true,
    leaderboard: ranked,
    competition_id: parseInt(competitionId),
    vehicle_class: vehicle_class || 'ALL',
    total_teams: ranked.length,
  });
};

// GET /api/leaderboard/:competitionId/my — Team: Get own position
const getMyPosition = async (req, res) => {
  const { competitionId } = req.params;
  const teamId = req.user.id;
  const reg = await pool.query(
    `SELECT competition_id FROM registrations WHERE team_user_id = $1 AND status = 'APPROVED'`,
    [teamId]
  );
  if (!reg.rows[0] || reg.rows[0].competition_id !== parseInt(competitionId, 10)) {
    return res.status(403).json({ success: false, message: 'You can only view your own competition leaderboard position' });
  }

  const result = await pool.query(
    `WITH ranked AS (
       SELECT u.id as team_id, r.team_name, r.college_name,
              COALESCE(SUM(te.score) FILTER (WHERE te.approved=TRUE), 0) as total_score,
              COALESCE(SUM(t.weight) FILTER (
                WHERE (t.task_type='SUBMISSION' AND s.status IN ('SUBMITTED','VIEWED'))
                   OR (t.task_type='TRACK_EVENT' AND te.approved=TRUE)
              ), 0) as progress_pct,
              RANK() OVER (ORDER BY COALESCE(SUM(te.score) FILTER (WHERE te.approved=TRUE),0) DESC) as rank
       FROM registrations r JOIN users u ON u.id = r.team_user_id
       LEFT JOIN tasks t ON t.competition_id = r.competition_id AND t.status='PUBLISHED'
       LEFT JOIN submissions s ON s.team_id=u.id AND s.task_id=t.id
       LEFT JOIN track_events te ON te.team_id=u.id AND te.task_id=t.id
       WHERE r.competition_id=$1 AND r.status='APPROVED'
       GROUP BY u.id, r.team_name, r.college_name
     )
     SELECT * FROM ranked WHERE team_id=$2`,
    [competitionId, teamId]
  );

  res.json({ success: true, ...result.rows[0] });
};

module.exports = { getLeaderboard, getMyPosition };
