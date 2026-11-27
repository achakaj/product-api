const { body, param, query, validationResult } = require('express-validator');

const productRules = [
  body('name').isString().isLength({ min: 3 }).withMessage('Name must be at least 3 chars')
    .bail().isLength({ max: 150 }).withMessage('Name must be at most 150 chars'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be positive')
    .bail().isFloat({ max: 99999999.99 }).withMessage('Price is too high')
    .toFloat(),
  body('category_id').optional({ values: 'null' }).isInt({ gt: 0 }).withMessage('category_id must be a positive integer').toInt()
];

const categoryRules = [
  body('name').isString().isLength({ min: 2 }).withMessage('Category name too short')
    .bail().isLength({ max: 100 }).withMessage('Category name too long')
];

// POST /api/products/with-category : produit + nom de catégorie
const withCategoryRules = [
  ...productRules.slice(0, 2),
  body('categoryName').isString().isLength({ min: 2 }).withMessage('Category name too short')
    .bail().isLength({ max: 100 }).withMessage('Category name too long')
];

// un id non numérique donne 400 au lieu d'une erreur SQL
const idRule = [param('id').isInt({ gt: 0 }).withMessage('id must be a positive integer').toInt()];

const searchRules = [
  query('name').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a number >= 0').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a number >= 0').toFloat(),
  query('categoryId').optional().isInt({ gt: 0 }).withMessage('categoryId must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0').toInt(),
  query('sort').optional().isIn(['id', 'name', 'price', 'category_id']).withMessage('sort must be id, name, price or category_id'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('order must be asc or desc')
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = { productRules, categoryRules, withCategoryRules, idRule, searchRules, validate };
