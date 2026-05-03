const pool = require('../config/database');
const logger = require('../utils/logger');

class User {
  static async create(userData) {
    const { name, email, password, role, phone, status } = userData;
    const query = `
      INSERT INTO users (name, email, password, role, phone, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, name, email, role, phone, status, created_at;
    `;
    const result = await pool.query(query, [name, email, password, role, phone, status]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, name, email, role, phone, status, created_at, updated_at
      FROM users WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT * FROM users WHERE email = $1;
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findAll(limit = 10, offset = 0) {
    const query = `
      SELECT id, name, email, role, phone, status, created_at
      FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2;
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async update(id, userData) {
    const { name, phone, status } = userData;
    const query = `
      UPDATE users SET name = $1, phone = $2, status = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, email, role, phone, status, updated_at;
    `;
    const result = await pool.query(query, [name, phone, status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `DELETE FROM users WHERE id = $1 RETURNING id;`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async count() {
    const query = `SELECT COUNT(*) as count FROM users;`;
    const result = await pool.query(query);
    return result.rows[0].count;
  }

  // Firebase methods
  static async createFirebaseUser(userData) {
    const { name, email, password, firebase_uid, profile_picture, role = 'TEAM', is_temp_password = false } = userData;
    const query = `
      INSERT INTO users (name, email, password, firebase_uid, profile_picture, role, is_temp_password, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
      RETURNING id, name, email, role, profile_picture, firebase_uid, is_temp_password, is_active, created_at;
    `;
    const result = await pool.query(query, [name, email, password, firebase_uid, profile_picture, role, is_temp_password]);
    return result.rows[0];
  }

  static async setTempPasswordFlag(userId, isTemp) {
    const query = `
      UPDATE users
      SET is_temp_password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, role, profile_picture, firebase_uid, is_temp_password, is_active, updated_at;
    `;
    const result = await pool.query(query, [isTemp, userId]);
    return result.rows[0];
  }

  static async updateFirebaseUid(userId, firebaseUid) {
    const query = `
      UPDATE users SET firebase_uid = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, role, profile_picture, firebase_uid, is_active, updated_at;
    `;
    const result = await pool.query(query, [firebaseUid, userId]);
    return result.rows[0];
  }

  static async findByFirebaseUid(firebaseUid) {
    const query = `
      SELECT id, name, email, role, profile_picture, firebase_uid, is_active, created_at
      FROM users WHERE firebase_uid = $1;
    `;
    const result = await pool.query(query, [firebaseUid]);
    return result.rows[0];
  }
}

module.exports = User;
