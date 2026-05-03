const pool = require('../config/database');

class Report {
  static async getDashboardStats() {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM assets) as total_assets,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM assets WHERE status = 'active') as active_assets,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') as tasks_in_progress,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks;
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getAssetStatusReport() {
    const query = `
      SELECT status, COUNT(*) as count
      FROM assets
      GROUP BY status
      ORDER BY count DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTaskStatusReport() {
    const query = `
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY count DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTaskPriorityReport() {
    const query = `
      SELECT priority, COUNT(*) as count
      FROM tasks
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getMaintenanceReport(startDate, endDate) {
    const query = `
      SELECT maintenance_type, COUNT(*) as count
      FROM tasks
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY maintenance_type;
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  static async getAssetsByCategory() {
    const query = `
      SELECT category, COUNT(*) as count
      FROM assets
      GROUP BY category
      ORDER BY count DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getUserWorkload() {
    const query = `
      SELECT u.id, u.name, COUNT(t.id) as task_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status != 'completed'
      WHERE u.role = 'technician'
      GROUP BY u.id, u.name
      ORDER BY task_count DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Report;
