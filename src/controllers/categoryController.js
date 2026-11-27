const categoryService = require('../services/categoryService');

async function getAll(req, res, next) {
  try {
    res.json(await categoryService.listCategories());
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    res.json(await categoryService.getCategory(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.createCategory({ name: req.body.name });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await categoryService.updateCategory(Number(req.params.id), { name: req.body.name });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await categoryService.deleteCategory(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove };
