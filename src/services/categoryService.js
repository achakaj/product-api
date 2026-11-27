const categoryRepo = require('../repositories/categoryRepository');
const productRepo = require('../repositories/productRepository');

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function listCategories() {
  return categoryRepo.getAll();
}

async function getCategory(id) {
  const category = await categoryRepo.getById(id);
  if (!category) throw httpError('Category not found', 404);
  return category;
}

async function createCategory(data) {
  return categoryRepo.create(data);
}

async function updateCategory(id, data) {
  await getCategory(id);
  return categoryRepo.update(id, data);
}

async function deleteCategory(id) {
  await getCategory(id);
  // le lab faisait "const [products] = await productRepo.getAll()" : getAll renvoie déjà
  // le tableau, donc on compte directement les produits liés avec une requête dédiée
  const linked = await productRepo.countByCategory(Number(id));
  if (linked > 0) throw httpError('Cannot delete category with linked products', 400);
  return categoryRepo.remove(id);
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
