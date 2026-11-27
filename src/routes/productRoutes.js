const express = require('express');
const controller = require('../controllers/productController');
const { productRules, withCategoryRules, idRule, searchRules, validate } = require('../middlewares/validation');

const router = express.Router();

router.get('/', controller.getAll);
// /search et /with-category avant /:id, sinon "search" serait pris pour un id
router.get('/search', searchRules, validate, controller.search);
router.post('/with-category', withCategoryRules, validate, controller.createWithCategory);
router.get('/:id', idRule, validate, controller.getOne);
router.post('/', productRules, validate, controller.create);
router.put('/:id', idRule, productRules, validate, controller.update);
router.delete('/:id', idRule, validate, controller.remove);

module.exports = router;
