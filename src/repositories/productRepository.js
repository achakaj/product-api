const pool = require('../config/db');

// colonnes autorisées pour le tri (on ne met jamais une valeur du client directement dans le SQL)
const SORT_COLUMNS = ['id', 'name', 'price', 'category_id'];

async function getAll() {
  const [rows] = await pool.query('SELECT * FROM products');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0];
}

async function create(product) {
  const categoryId = product.category_id ?? null;
  const [result] = await pool.execute(
    'INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)',
    [product.name, product.price, categoryId]
  );
  return { id: result.insertId, name: product.name, price: product.price, category_id: categoryId };
}

async function update(id, product) {
  const categoryId = product.category_id ?? null;
  const [result] = await pool.execute(
    'UPDATE products SET name = ?, price = ?, category_id = ? WHERE id = ?',
    [product.name, product.price, categoryId, id]
  );
  if (result.affectedRows === 0) return null;
  return { id, name: product.name, price: product.price, category_id: categoryId };
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function countByCategory(categoryId) {
  const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM products WHERE category_id = ?', [categoryId]);
  return rows[0].total;
}

// Recherche avec filtres, tri et pagination
async function search({ name, minPrice, maxPrice, categoryId, limit = 10, offset = 0, sort = 'name', order = 'asc' } = {}) {
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (name) {
    sql += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (minPrice !== undefined) {
    sql += ' AND price >= ?';
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    sql += ' AND price <= ?';
    params.push(maxPrice);
  }
  if (categoryId !== undefined) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }

  const column = SORT_COLUMNS.includes(sort) ? sort : 'name';
  const direction = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${column} ${direction}, id ASC LIMIT ? OFFSET ?`;
  params.push(Number.parseInt(limit, 10), Number.parseInt(offset, 10));

  // pool.query (et pas execute) : execute pose problème avec LIMIT/OFFSET dans mysql2
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { getAll, getById, create, update, remove, search, countByCategory, SORT_COLUMNS };
