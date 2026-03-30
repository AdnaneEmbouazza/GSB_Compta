const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, categoryController.getCategories);
router.get('/new', authenticateToken, categoryController.showCreateForm);
router.post('/', authenticateToken, categoryController.createCategory);
router.get('/:id/edit', authenticateToken, categoryController.showEditForm);
router.put('/:id', authenticateToken, categoryController.updateCategory);
router.delete('/:id', authenticateToken, categoryController.deleteCategory);

module.exports = router;
