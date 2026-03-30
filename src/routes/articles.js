const express = require('express');
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', articleController.getArticles);
router.get('/new', articleController.showCreateForm);
router.post('/', articleController.createArticle);
router.get('/:id/edit', articleController.showEditForm);
router.put('/:id', articleController.updateArticle);
router.delete('/:id', articleController.deleteArticle);

module.exports = router;
