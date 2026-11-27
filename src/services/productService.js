const pool = require('../config/db');
const productRepo = require('../repositories/productRepository');
const categoryRepo = require('../repositories/categoryRepository');

// erreur avec un code HTTP (lu par le middleware errorHandler)
function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function listProducts() {
  return productRepo.getAll();
}

async function getProduct(id) {
  const product = await productRepo.getById(id);
  if (!product) throw httpError('Product not found', 404);
  return product;
}

async function checkCategory(categoryId) {
  if (categoryId === undefined || categoryId === null) return;
  const category = await categoryRepo.getById(categoryId);
  if (!category) throw httpError('Invalid category_id', 400);
}

async function createProduct(data) {
  await checkCategory(data.category_id);
  return productRepo.create(data);
}

async function updateProduct(id, data) {
  await getProduct(id);
  await checkCategory(data.category_id);
  return productRepo.update(id, data);
}

async function deleteProduct(id) {
  await getProduct(id);
  return productRepo.remove(id);
}

async function searchProducts(filters) {
  return productRepo.search(filters);
}

// Transaction : la catégorie (créée si besoin) et le produit sont enregistrés ensemble, ou pas du tout
async function createProductWithCategory(product, categoryName) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT id FROM categories WHERE name = ?', [categoryName]);
    let categoryId;
    if (rows.length > 0) {
      categoryId = rows[0].id;
    } else {
      const [result] = await conn.execute('INSERT INTO categories (name) VALUES (?)', [categoryName]);
      categoryId = result.insertId;
    }

    const [result] = await conn.execute(
      'INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)',
      [product.name, product.price, categoryId]
    );

    await conn.commit();
    return { id: result.insertId, name: product.name, price: product.price, category_id: categoryId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  createProductWithCategory
};
