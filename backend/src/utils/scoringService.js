const pool = require('../config/database');
const logger = require('../utils/logger');

const calculateScoresForTask = async (taskId) => {
  const taskResult = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  const task = taskResult.rows[0];

  if (!task || task.formula_type === 'NONE') return;

  const entries = await pool.query(
    `SELECT id, admin_time FROM track_events WHERE task_id = $1 AND admin_time IS NOT NULL`,
    [taskId]
  );

  if (entries.rows.length === 0) return;

  const times = entries.rows.map(e => parseFloat(e.admin_time)).filter(t => t > 0);
  if (times.length === 0) return;

  const Tmin = Math.min(...times);
  const Tmax = 1.5 * Tmin; // Standard FMAE/FSAE rule for Tmax

  for (const entry of entries.rows) {
    const Tteam = parseFloat(entry.admin_time);
    let score = 0;

    if (Tteam > 0 && Tteam <= Tmax) {
      switch (task.formula_type) {
        case 'ACCELERATION':
          // Score = 95.5 * ((Tmax/Tteam)-1) / ((Tmax/Tmin)-1) + 4.5
          score = 95.5 * ((Tmax / Tteam) - 1) / ((Tmax / Tmin) - 1) + 4.5;
          break;
        case 'SKIDPAD':
          // Score = 71.5 * ((Tmax/Tteam)^2 - 1) / ((Tmax/Tmin)^2 - 1) + 3.5
          score = 71.5 * (Math.pow(Tmax / Tteam, 2) - 1) / (Math.pow(Tmax / Tmin, 2) - 1) + 3.5;
          break;
        case 'AUTOCROSS':
          // Score = 118.5 * ((Tmax/Tteam)-1) / ((Tmax/Tmin)-1) + 6.5
          score = 118.5 * ((Tmax / Tteam) - 1) / ((Tmax / Tmin) - 1) + 6.5;
          break;
        case 'ENDURANCE':
          // Score = 250 * ((Tmax/Tteam)-1) / ((Tmax/Tmin)-1)
          score = 250 * ((Tmax / Tteam) - 1) / ((Tmax / Tmin) - 1);
          break;
        default:
          score = 0;
      }
    }

    // Round to 2 decimal places
    const finalScore = Math.min(task.max_score || 1000, Math.max(0, parseFloat(score.toFixed(2))));

    await pool.query(
      `UPDATE track_events SET score = $1, updated_at = NOW() WHERE id = $2`,
      [finalScore, entry.id]
    );
  }

  logger.info(`Recalculated scores for task ${taskId} (${task.formula_type})`);
};

module.exports = { calculateScoresForTask };
