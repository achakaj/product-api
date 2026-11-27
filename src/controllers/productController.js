const productService = require('../services/productService');

async function getAll(req, res, next) {
  try {
    res.json(await productService.listProducts());
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    res.json(await productService.getProduct(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, price, category_id } = req.body;
    const product = await productService.createProduct({ name, price, category_id });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { name, price, category_id } = req.body;
    const product = await productService.updateProduct(Number(req.params.id), { name, price, category_id });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await productService.deleteProduct(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function search(req, res, next) {
  try {
    const { name, minPrice, maxPrice, categoryId, limit, offset, sort, order } = req.query;
    res.json(await productService.searchProducts({ name, minPrice, maxPrice, categoryId, limit, offset, sort, order }));
  } catch (err) {
    next(err);
  }
}

async function createWithCategory(req, res, next) {
  try {
    const { name, price, categoryName } = req.body;
    const product = await productService.createProductWithCategory({ name, price }, categoryName);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove, search, createWithCategory };
