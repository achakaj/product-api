const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY id');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0];
}

async function create(category) {
  const [result] = await pool.execute('INSERT INTO categories (name) VALUES (?)', [category.name]);
  return { id: result.insertId, name: category.name };
}

async function update(id, category) {
  const [result] = await pool.execute('UPDATE categories SET name = ? WHERE id = ?', [category.name, id]);
  if (result.affectedRows === 0) return null;
  return { id, name: category.name };
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
