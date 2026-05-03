const pool = require('../config/database');

class Asset {
  static async create(assetData) {
    const {
      asset_code, name, description, category, type, status, location,
      purchase_date, warranty_expiry, supplier, cost, assigned_to, created_by,
    } = assetData;

    const query = `
      INSERT INTO assets 
      (asset_code, name, description, category, type, status, location, purchase_date, 
       warranty_expiry, supplier, cost, assigned_to, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [
      asset_code, name, description, category, type, status, location,
      purchase_date, warranty_expiry, supplier, cost, assigned_to, created_by,
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT * FROM assets WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(limit = 20, offset = 0, filters = {}) {
    let query = `SELECT * FROM assets WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.location) {
      query += ` AND location ILIKE $${paramCount}`;
      params.push(`%${filters.location}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, assetData) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(assetData)) {
      fields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const query = `UPDATE assets SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *;`;
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `DELETE FROM assets WHERE id = $1 RETURNING id;`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async count(filters = {}) {
    let query = `SELECT COUNT(*) as count FROM assets WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ` AND status = $1`;
      params.push(filters.status);
    }

    const result = await pool.query(query, params);
    return result.rows[0].count;
  }
}

module.exports = Asset;
