const express = require('express');
const controller = require('../controllers/categoryController');
const { categoryRules, idRule, validate } = require('../middlewares/validation');

const router = express.Router();

router.get('/', controller.getAll);
router.get('/:id', idRule, validate, controller.getOne);
router.post('/', categoryRules, validate, controller.create);
router.put('/:id', idRule, categoryRules, validate, controller.update);
router.delete('/:id', idRule, validate, controller.remove);

module.exports = router;
