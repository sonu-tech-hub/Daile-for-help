const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// All routes are public
router.get('/', categoryController.getAllCategories);
router.get('/popular', categoryController.getPopularCategories);
router.get('/:categoryId', categoryController.getCategoryById);

module.exports = router;
