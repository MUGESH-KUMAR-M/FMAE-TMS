const pool = require('../config/database');

class Task {
  static async create(taskData) {
    const {
      title, description, status, priority, assigned_to, asset_id,
      maintenance_type, scheduled_date, due_date, created_by,
    } = taskData;

    const query = `
      INSERT INTO tasks 
      (title, description, status, priority, assigned_to, asset_id, maintenance_type,
       scheduled_date, due_date, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [
      title, description, status, priority, assigned_to, asset_id,
      maintenance_type, scheduled_date, due_date, created_by,
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT t.*, u.name as assigned_user, a.name as asset_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN assets a ON t.asset_id = a.id
      WHERE t.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(limit = 20, offset = 0, filters = {}) {
    let query = `
      SELECT t.*, u.name as assigned_user, a.name as asset_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN assets a ON t.asset_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters.assigned_to) {
      query += ` AND t.assigned_to = $${paramCount}`;
      params.push(filters.assigned_to);
      paramCount++;
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, taskData) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(taskData)) {
      fields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *;`;
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `DELETE FROM tasks WHERE id = $1 RETURNING id;`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async count(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM tasks WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ` AND status = $1`;
      params.push(filters.status);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  }
}

module.exports = Task;
